/**
 * Secret protected cache revalidation endpoint.
 *
 * Public settings and content reads are cached for up to an hour (see
 * src/lib/cache.ts). Normal admin edits invalidate the relevant tags
 * automatically. This endpoint exists for operational cases outside that
 * flow, such as a database seed or migration applied directly, where the
 * cache needs to be refreshed without waiting for the natural expiry.
 *
 * Requires header x-revalidate-secret to match REVALIDATE_SECRET. The
 * route is inert (404) when that variable is not configured.
 */

import type { NextRequest } from "next/server";

import { optionalEnv } from "@/lib/env";
import { invalidateContent, invalidateSettings } from "@/lib/invalidate";
import type { ContentType } from "@/lib/db";

export const runtime = "nodejs";

const CONTENT_TYPES: ContentType[] = ["service", "project", "csr_story", "news"];

export async function POST(request: NextRequest) {
  const secret = optionalEnv("REVALIDATE_SECRET");
  if (!secret) {
    return new Response("Not found", { status: 404 });
  }

  const provided = request.headers.get("x-revalidate-secret");
  if (provided !== secret) {
    return new Response("Not found", { status: 404 });
  }

  invalidateSettings();
  for (const type of CONTENT_TYPES) {
    invalidateContent(type);
  }

  return Response.json({ status: "ok", revalidated: ["settings", ...CONTENT_TYPES] });
}
