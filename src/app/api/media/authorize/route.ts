/**
 * Upload authorisation endpoint. Issues short-lived signed upload
 * authorisations only after server side role checks.
 */

import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { assertSameOrigin, jsonError } from "@/lib/utils/http";
import { AppError } from "@/lib/errors";
import { authorizeUpload } from "@/lib/media/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "canUploadMedia")) {
      throw new AppError("forbidden", "You do not have permission to upload images.");
    }
    await assertSameOrigin();
    const body = (await request.json().catch(() => null)) as {
      mimeType?: unknown;
    } | null;
    if (!body || typeof body.mimeType !== "string") {
      throw new AppError("bad_request", "Choose a valid image type.");
    }
    const authorisation = await authorizeUpload({
      actor: user,
      mimeType: body.mimeType,
    });
    return Response.json({ ok: true, ...authorisation });
  } catch (error) {
    return jsonError(error);
  }
}
