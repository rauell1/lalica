import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

import { getAuth } from "@/lib/auth/config";
import { clientIpFromHeaders, jsonError } from "@/lib/utils/http";
import { enforceLimit, hashIdentifier } from "@/lib/ratelimit";

const handler = toNextJsHandler(getAuth());

/**
 * Wrap the Better Auth handler so authentication initiation endpoints
 * additionally pass through the distributed rate limiter, alongside the
 * provider protections Better Auth applies itself.
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth/sign-in")) {
      const ip = clientIpFromHeaders(request.headers);
      await enforceLimit("authInit", hashIdentifier("authInit", `ip:${ip}`));
    }
    return handler.POST(request);
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    return handler.GET(request);
  } catch (error) {
    return jsonError(error);
  }
}
