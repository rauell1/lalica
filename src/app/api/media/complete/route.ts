/**
 * Completes a client side Vercel Blob upload: verifies the reported
 * object against the authorised pathname, re-checks the role, validates
 * the stored bytes, and creates the media row.
 */

import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { assertSameOrigin, jsonError } from "@/lib/utils/http";
import { AppError } from "@/lib/errors";
import { completeBlobUpload } from "@/lib/media/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "canUploadMedia")) {
      throw new AppError("forbidden", "You do not have permission to upload images.");
    }
    await assertSameOrigin();

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (
      !body ||
      typeof body.pathname !== "string" ||
      typeof body.url !== "string" ||
      typeof body.mimeType !== "string"
    ) {
      throw new AppError("bad_request", "Missing upload data.");
    }
    if (typeof body.altText !== "string" || !body.altText.trim()) {
      throw new AppError(
        "validation",
        "Alt text is required for every uploaded image.",
        { fieldErrors: { altText: ["Describe the image for screen reader users."] } },
      );
    }

    const row = await completeBlobUpload({
      actor: user,
      pathname: body.pathname,
      url: body.url,
      mimeType: body.mimeType,
      meta: {
        altText: body.altText.trim().slice(0, 200),
        caption: typeof body.caption === "string" ? body.caption : undefined,
        sourceNote:
          typeof body.sourceNote === "string" ? body.sourceNote : undefined,
        rightsStatus: ["cleared", "unconfirmed", "illustrative"].includes(
          String(body.rightsStatus),
        )
          ? (String(body.rightsStatus) as "cleared" | "unconfirmed" | "illustrative")
          : "unconfirmed",
      },
    });

    return Response.json({ ok: true, media: row }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
