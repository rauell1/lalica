import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";
import {
  __resetLimitersForTests,
  enforceLimit,
  getLimiter,
  hashIdentifier,
  LIMITS,
} from "@/lib/ratelimit";

afterEach(() => {
  vi.unstubAllEnvs();
  __resetLimitersForTests();
});

describe("in-memory limiter (development)", () => {
  it("allows the configured burst and then fails with remaining 0", async () => {
    const limiter = getLimiter("enquiryIp");
    const identifier = "test-identifier-a";
    for (let i = 0; i < LIMITS.enquiryIp.requests; i++) {
      const result = await limiter.consume(identifier);
      expect(result.success).toBe(true);
    }
    const blocked = await limiter.consume(identifier);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks identifiers independently", async () => {
    const limiter = getLimiter("enquiryIp");
    await limiter.consume("test-identifier-b");
    const other = await limiter.consume("test-identifier-c");
    expect(other.success).toBe(true);
  });

  it("enforceLimit throws a 429 style AppError after the burst", async () => {
    for (let i = 0; i < LIMITS.enquiryEmail.requests; i++) {
      await enforceLimit("enquiryEmail", "test-identifier-d");
    }
    await expect(
      enforceLimit("enquiryEmail", "test-identifier-d"),
    ).rejects.toMatchObject({
      kind: "rate_limited",
      retryAfterSeconds: expect.any(Number),
    } as Partial<AppError>);
  });

  it("fails closed in production without Upstash configuration", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("ALLOW_LOCAL_LIMITER", "");
    const limiter = getLimiter("authInit");
    await expect(limiter.consume("test-identifier-e")).rejects.toMatchObject({
      kind: "service_unavailable",
    } as Partial<AppError>);
  });
});

describe("limiter identifier hashing", () => {
  it("never stores the raw identifier", () => {
    const raw = "192.0.2.10";
    const hashed = hashIdentifier("enquiryIp", raw);
    expect(hashed).not.toContain("192.0.2.10");
    expect(hashed).toMatch(/^[0-9a-f]{40}$/);
  });

  it("produces different digests per kind and input", () => {
    const a = hashIdentifier("enquiryIp", "192.0.2.10");
    const b = hashIdentifier("enquiryIp", "192.0.2.11");
    const c = hashIdentifier("enquiryEmail", "192.0.2.10");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
