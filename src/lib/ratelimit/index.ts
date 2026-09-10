/**
 * Distributed rate limiting.
 *
 * Production uses Upstash Redis so counters are atomic and shared across
 * all Vercel instances. Local development uses a clearly labelled
 * in-memory limiter for demos and tests. If no limiter backend is
 * configured in production, sensitive operations fail closed with a
 * temporary failure message while cacheable public pages stay available.
 */

import { createHmac } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

export type LimitKind =
  | "enquiryIp"
  | "enquiryEmail"
  | "authInit"
  | "contentMutation"
  | "uploadAuthorize"
  | "enquiryExport";

export const LIMITS: Record<
  LimitKind,
  { requests: number; windowSeconds: number; label: string }
> = {
  enquiryIp: {
    requests: 5,
    windowSeconds: 15 * 60,
    label: "Enquiry submissions per network",
  },
  enquiryEmail: {
    requests: 3,
    windowSeconds: 60 * 60,
    label: "Enquiry submissions per email address",
  },
  authInit: {
    requests: 10,
    windowSeconds: 15 * 60,
    label: "Sign-in attempts per network",
  },
  contentMutation: {
    requests: 60,
    windowSeconds: 60,
    label: "Content changes per signed-in user",
  },
  uploadAuthorize: {
    requests: 20,
    windowSeconds: 60 * 60,
    label: "Upload authorisations per signed-in user",
  },
  enquiryExport: {
    requests: 5,
    windowSeconds: 60 * 60,
    label: "Enquiry exports per signed-in user",
  },
};

export interface LimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

interface Limiter {
  consume(identifier: string): Promise<LimitResult>;
}

class UpstashLimiter implements Limiter {
  private readonly instance: Ratelimit;
  private readonly limit: number;

  constructor(kind: LimitKind) {
    const env = getServerEnv();
    const redis = new Redis({
      url: env.upstashRedisRestUrl as string,
      token: env.upstashRedisRestToken as string,
    });
    const config = LIMITS[kind];
    this.limit = config.requests;
    this.instance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.requests,
        `${config.windowSeconds} s`,
      ),
      prefix: `lalica:${kind}`,
    });
  }

  async consume(identifier: string): Promise<LimitResult> {
    const result = await this.instance.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    };
  }
}

class InMemoryLimiter implements Limiter {
  private readonly entries = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(private readonly kind: LimitKind) {}

  async consume(identifier: string): Promise<LimitResult> {
    const config = LIMITS[this.kind];
    const now = Date.now();
    const entry = this.entries.get(identifier);

    if (!entry || entry.resetAt <= now) {
      this.entries.set(identifier, {
        count: 1,
        resetAt: now + config.windowSeconds * 1000,
      });
      return {
        success: true,
        remaining: config.requests - 1,
        reset: Math.floor(now / 1000) + config.windowSeconds,
        limit: config.requests,
      };
    }

    entry.count += 1;
    if (this.entries.size > 20_000) {
      for (const [key, value] of this.entries) {
        if (value.resetAt <= now) this.entries.delete(key);
      }
    }
    const remaining = Math.max(0, config.requests - entry.count);
    return {
      success: entry.count <= config.requests,
      remaining,
      reset: Math.floor(entry.resetAt / 1000),
      limit: config.requests,
    };
  }
}

class FailClosedLimiter implements Limiter {
  async consume(): Promise<LimitResult> {
    throw new AppError(
      "service_unavailable",
      "This service is temporarily unavailable because the rate limiter is not configured. Please try again shortly.",
    );
  }
}

const limiterCache = new Map<LimitKind, Limiter>();

export function getLimiter(kind: LimitKind): Limiter {
  const cached = limiterCache.get(kind);
  if (cached) return cached;

  const env = getServerEnv();
  let limiter: Limiter;
  if (env.upstashRedisRestUrl && env.upstashRedisRestToken) {
    limiter = new UpstashLimiter(kind);
  } else if (env.localLimiterAllowed) {
    limiter = new InMemoryLimiter(kind);
  } else {
    limiter = new FailClosedLimiter();
  }
  limiterCache.set(kind, limiter);
  return limiter;
}

/** Identifier hashing: never retain raw IP addresses in the limiter. */
export function hashIdentifier(kind: LimitKind, raw: string): string {
  const env = getServerEnv();
  const digest = createHmac("sha256", env.authSecret)
    .update(`${kind}:${raw.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 40);
  return digest;
}

/**
 * Check a limit and throw a 429 AppError with Retry-After information
 * when it has been exceeded. Checks run before expensive work.
 */
export async function enforceLimit(
  kind: LimitKind,
  identifier: string,
): Promise<void> {
  const limiter = getLimiter(kind);
  const result = await limiter.consume(identifier);
  if (!result.success) {
    throw new AppError(
      "rate_limited",
      `Too many requests. ${LIMITS[kind].label}: ${LIMITS[kind].requests} per ${Math.round(LIMITS[kind].windowSeconds / 60)} minutes. Please wait and try again.`,
      { retryAfterSeconds: Math.max(1, result.reset - Math.floor(Date.now() / 1000)) },
    );
  }
}

/** Reset in-memory limiter state. Used by the test suite only. */
export function __resetLimitersForTests(): void {
  for (const [key, limiter] of limiterCache) {
    if (limiter instanceof InMemoryLimiter) {
      limiterCache.delete(key);
    }
  }
}
