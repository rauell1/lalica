/**
 * Local demonstration sign-in.
 *
 * Only available outside production and only when
 * AUTH_DEMO_MODE_ENABLED=true. It creates a real Better Auth session for
 * one of the seeded demo staff accounts so the full role model can be
 * exercised locally. Production never enables this route, and production
 * startup rejects demo authentication entirely.
 */

import { randomUUID, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb, sessions, users } from "@/lib/db";
import { getServerEnv, isProduction } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { ROLES, type UserRole } from "@/lib/db";
import { assertSameOrigin, jsonError } from "@/lib/utils/http";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit/service";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  try {
    const env = getServerEnv();
    if (isProduction() || !env.demoModeEnabled) {
      return new Response(null, { status: 404 });
    }
    await assertSameOrigin();

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const role = body?.role;
    if (typeof role !== "string" || !ROLES.includes(role as UserRole)) {
      throw new AppError("bad_request", "Choose a valid demo role.");
    }

    const db = getDb();
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.subject, `demo:${role}`))
      .limit(1);
    const demoUser = rows[0];
    if (!demoUser) {
      throw new AppError("not_found", "The demo account for this role is not seeded.");
    }

    const token = randomBytes(48).toString("base64url");
    await db.insert(sessions).values({
      id: randomUUID(),
      token,
      userId: demoUser.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
      ipAddress: null,
      userAgent: null,
    });
    await writeAudit({
      actorId: demoUser.id,
      action: "user.sign_in",
      entityType: "user",
      entityId: demoUser.id,
      metadata: { demo: true },
    });

    // Better Auth reads signed cookies: value.signature where the
    // signature is standard-base64 HMAC-SHA256 of the value keyed with
    // the auth secret. Replicate that format so getSession accepts it.
    const secret = new TextEncoder().encode(env.authSecret);
    const key = await crypto.subtle.importKey(
      "raw",
      secret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(token),
    );
    const signature = Buffer.from(signatureBytes).toString("base64");
    const cookieValue = encodeURIComponent(`${token}.${signature}`);

    const secure = env.appUrl.startsWith("https://") ? "; Secure" : "";
    const response = Response.json({ ok: true }, { status: 200 });
    response.headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`,
    );
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
