import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

import { getAuth } from "@/lib/auth/config";
import { clientIpFromHeaders, jsonError } from "@/lib/utils/http";
import { enforceLimit, hashIdentifier } from "@/lib/ratelimit";
import { writeAudit } from "@/lib/audit/service";

const handler = toNextJsHandler(getAuth());

/**
 * Wrap the Better Auth handler so authentication initiation endpoints
 * additionally pass through the distributed rate limiter, alongside the
 * provider protections Better Auth applies itself, and so sign-out gets
 * an audit entry (Better Auth has no databaseHooks.session.delete hook to
 * do this from inside the library itself).
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth/sign-in")) {
      const ip = clientIpFromHeaders(request.headers);
      await enforceLimit("authInit", hashIdentifier("authInit", `ip:${ip}`));
    }
    if (url.pathname === "/api/auth/sign-out") {
      const session = await getAuth().api.getSession({ headers: request.headers });
      if (session) {
        await writeAudit({
          actorId: session.user.id,
          action: "user.sign_out",
          entityType: "user",
          entityId: session.user.id,
        });
      }
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
