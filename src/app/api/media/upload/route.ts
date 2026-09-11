/**
 * Local development upload endpoint. Only reachable when the app is not
 * running in production: the authorisation ticket is signed server side
 * and bound to the uploading user, file bytes are verified by signature,
 * size, and dimensions, and metadata is stripped before storage.
 */

import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { assertSameOrigin, jsonError } from "@/lib/utils/http";
import { AppError } from "@/lib/errors";
import { isProduction } from "@/lib/env";
import { completeLocalUpload, MAX_UPLOAD_BYTES } from "@/lib/media/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (isProduction()) {
      return new Response(null, { status: 404 });
    }
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "canUploadMedia")) {
      throw new AppError("forbidden", "You do not have permission to upload images.");
    }
    await assertSameOrigin();

    const form = await request.formData();
    const ticket = form.get("ticket");
    const file = form.get("file");
    const altText = form.get("altText");
    if (typeof ticket !== "string" || !(file instanceof File)) {
      throw new AppError("bad_request", "Missing upload data.");
    }
    if (typeof altText !== "string" || !altText.trim()) {
      throw new AppError(
        "validation",
        "Alt text is required for every uploaded image.",
        { fieldErrors: { altText: ["Describe the image for screen reader users."] } },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new AppError("bad_request", "The image is larger than the 10 MB limit.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const captionValue = form.get("caption");
    const sourceNoteValue = form.get("sourceNote");
    const row = await completeLocalUpload({
      actor: user,
      ticket,
      buffer,
      mimeType: file.type || "application/octet-stream",
      meta: {
        altText: altText.trim().slice(0, 200),
        caption: typeof captionValue === "string" ? captionValue : undefined,
        sourceNote:
          typeof sourceNoteValue === "string" ? sourceNoteValue : undefined,
        rightsStatus: ["cleared", "unconfirmed", "illustrative"].includes(
          String(form.get("rightsStatus")),
        )
          ? (String(form.get("rightsStatus")) as "cleared" | "unconfirmed" | "illustrative")
          : "unconfirmed",
      },
    });

    return Response.json({ ok: true, media: row }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
