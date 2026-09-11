/**
 * HTTP helpers for route handlers.
 */

import { headers } from "next/headers";

import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";

const IP_PATTERN =
  /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/;

/**
 * Best-effort client IP from trusted platform metadata. On Vercel the
 * x-forwarded-for header is set by the platform edge, not by the client;
 * arbitrary forwarded IP headers from the client are never trusted here.
 */
export function clientIpFromHeaders(
  requestHeaders: Headers,
): string {
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && IP_PATTERN.test(first)) return first;
  }
  const realIp = requestHeaders.get("x-real-ip");
  if (realIp && IP_PATTERN.test(realIp)) return realIp;
  return "local";
}

export async function getClientIp(): Promise<string> {
  return clientIpFromHeaders(await headers());
}

/**
 * Same-origin guard for state changing routes. Rejects requests whose
 * Origin header does not match the configured app origin. Requests
 * without an Origin header (for example curl) rely on CSRF protections
 * of the auth layer and are rejected for public forms.
 */
export async function assertSameOrigin(): Promise<void> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (!origin) {
    throw new AppError(
      "bad_request",
      "This request is missing the Origin header required for form submissions.",
    );
  }
  const env = getServerEnv();
  const allowed = new Set<string>([env.appUrl]);
  if (!allowed.has(origin)) {
    throw new AppError("forbidden", "This request was rejected.");
  }
}

export function jsonError(error: unknown): Response {
  if (error instanceof AppError) {
    const status = statusFor(error);
    const body: Record<string, unknown> = { error: error.message };
    if (error.fieldErrors) body.fieldErrors = error.fieldErrors;
    const response = Response.json(body, { status });
    if (status === 429 && error.retryAfterSeconds) {
      response.headers.set(
        "Retry-After",
        String(Math.ceil(error.retryAfterSeconds)),
      );
    }
    return response;
  }
  console.error("[api] unhandled error", error);
  return Response.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}

function statusFor(error: AppError): number {
  switch (error.kind) {
    case "bad_request":
      return 400;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "rate_limited":
      return 429;
    case "service_unavailable":
      return 503;
    case "validation":
      return 422;
  }
}
