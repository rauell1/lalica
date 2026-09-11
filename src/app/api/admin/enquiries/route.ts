/**
 * Admin enquiry management endpoints (role protected).
 */

import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { assertSameOrigin, jsonError } from "@/lib/utils/http";
import { AppError } from "@/lib/errors";
import {
  exportEnquiriesCsv,
  updateEnquiry,
} from "@/lib/enquiry/service";
import { type EnquiryStatus } from "@/lib/db";
import { enforceLimit, hashIdentifier } from "@/lib/ratelimit";

export const runtime = "nodejs";

async function requireEnquiryAccess() {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.role, "canAccessEnquiries")) {
    throw new AppError("forbidden", "You do not have access to enquiries.");
  }
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireEnquiryAccess();
    await assertSameOrigin();
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body.id !== "string") {
      throw new AppError("bad_request", "Invalid request.");
    }
    const status =
      typeof body.status === "string" ? (body.status as EnquiryStatus) : undefined;
    const assignedToId =
      typeof body.assignedToId === "string" ? body.assignedToId : null;

    const row = await updateEnquiry({
      actor: user,
      id: body.id,
      status,
      assignedToId,
    });
    return Response.json({ ok: true, row: { id: row.id, status: row.status } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireEnquiryAccess();
    await enforceLimit(
      "enquiryExport",
      hashIdentifier("enquiryExport", `user:${user.id}`),
    );
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "all";
    const q = url.searchParams.get("q") ?? undefined;
    const { csv } = await exportEnquiriesCsv(user, { status: status as never, q });
    const date = new Date().toISOString().slice(0, 10);
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lalica-enquiries-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
