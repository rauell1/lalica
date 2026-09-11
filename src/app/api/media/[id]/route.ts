/**
 * Serves media through the site origin.
 *
 * Published images redirect to the public object storage URL (or stream
 * from the local development store). Draft images require an active
 * staff session and are never cached publicly.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getPublicDb, runAsActor, media } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { readLocalFile } from "@/lib/media/service";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f-]{36}$/;

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_PATTERN.test(id)) {
    return new Response(null, { status: 404 });
  }

  // Look up the session before querying so a staff member's request runs
  // with their RLS visibility (draft and published); an anonymous request
  // only ever sees published rows, so a draft id simply comes back empty.
  const user = await getSessionUser();
  const row = user
    ? await runAsActor(user.id, async (db) => {
        const rows = await db.select().from(media).where(eq(media.id, id)).limit(1);
        return rows[0];
      })
    : await getPublicDb()
        .select()
        .from(media)
        .where(eq(media.id, id))
        .limit(1)
        .then((rows) => rows[0]);
  if (!row) return new Response(null, { status: 404 });

  if (row.status === "published") {
    if (row.storageProvider === "blob" && row.publicUrl) {
      return new Response(null, {
        status: 308,
        headers: {
          Location: row.publicUrl,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (row.storageProvider === "local") {
      const buffer = await readLocalFile(row.storageKey).catch(() => null);
      if (!buffer) return new Response(null, { status: 404 });
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": row.mimeType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
    return new Response(null, { status: 404 });
  }

  // Draft media: staff only, never publicly cached.
  if (!user || !hasPermission(user.role, "canUploadMedia")) {
    return new Response(null, { status: 404 });
  }

  if (row.storageProvider === "blob") {
    if (!row.publicUrl) return new Response(null, { status: 404 });
    // Do not redirect: stream through the authenticated route so the
    // draft URL stays access-controlled.
    const { get } = await import("@vercel/blob");
    const { getServerEnv } = await import("@/lib/env");
    const env = getServerEnv();
    const blob = await get(row.storageKey, {
      token: env.blobReadWriteToken,
      access: "public",
    }).catch(() => null);
    if (!blob || !blob.stream) return new Response(null, { status: 404 });
    return new Response(blob.stream, {
      headers: {
        "Content-Type": row.mimeType,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const buffer = await readLocalFile(row.storageKey).catch(() => null);
  if (!buffer) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
