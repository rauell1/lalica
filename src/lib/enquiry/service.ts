/**
 * Enquiry storage and management.
 *
 * The enquiry is saved successfully before a success message is shown,
 * and the idempotency key guarantees retries cannot create duplicates.
 */

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";

import {
  enquiries,
  getDb,
  type EnquiryStatus,
} from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertPermission, type SessionUser } from "@/lib/auth/roles";
import { writeAudit } from "@/lib/audit/service";
import { normaliseEmail } from "@/lib/utils/text";
import { toCsv } from "@/lib/utils/csv";
import { enquiryFieldErrors, enquiryPayloadSchema, type EnquiryPayload } from "./schemas";
import { PRIVACY_POLICY_VERSION } from "./constants";
import { sendEnquiryNotification, type EmailTransport } from "./notify";

export { PRIVACY_POLICY_VERSION };

export interface EnquiryRow {
  id: string;
  publicRef: string;
  name: string;
  organisation: string | null;
  email: string;
  telephone: string | null;
  serviceInterest: string;
  message: string;
  privacyVersion: string;
  idempotencyKey: string;
  status: EnquiryStatus;
  assignedToId: string | null;
  notificationStatus: "pending" | "sent" | "failed" | "disabled";
  notificationError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function generatePublicRef(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 6; i += 1) {
    value += alphabet[randomInt(0, alphabet.length)];
  }
  return `ENQ-${value}`;
}

export async function validateEnquiryPayload(value: unknown): Promise<EnquiryPayload> {
  const fieldErrors = enquiryFieldErrors(value);
  if (fieldErrors) {
    throw new AppError("validation", "Please correct the highlighted fields.", {
      fieldErrors,
    });
  }
  return enquiryPayloadSchema.parse(value);
}

/**
 * Store an enquiry idempotently. Returns the stored row and whether it
 * was created by this call or returned from an earlier retry.
 */
export async function createEnquiry(input: {
  payload: EnquiryPayload;
  privacyVersion: string;
  emailTransport?: EmailTransport;
}): Promise<{ row: EnquiryRow; created: boolean }> {
  const db = getDb();
  const publicRef = generatePublicRef();

  try {
    const inserted = await db
      .insert(enquiries)
      .values({
        publicRef,
        name: input.payload.name,
        organisation: input.payload.organisation || null,
        email: normaliseEmail(input.payload.email),
        telephone: input.payload.telephone || null,
        serviceInterest: input.payload.serviceInterest,
        message: input.payload.message,
        privacyVersion: input.privacyVersion,
        idempotencyKey: input.payload.idempotencyKey,
      })
      .returning();
    const row = inserted[0] as EnquiryRow;

    // Notification runs after storage succeeds. Failures are recorded on
    // the enquiry and surfaced in the admin area; the enquiry is kept.
    const notifyResult = await sendEnquiryNotification(
      {
        publicRef: row.publicRef,
        name: row.name,
        organisation: row.organisation ?? "",
        email: row.email,
        telephone: row.telephone ?? "",
        serviceInterest: row.serviceInterest,
        message: row.message,
      },
      input.emailTransport,
    );
    await db
      .update(enquiries)
      .set({
        notificationStatus: notifyResult.status,
        notificationError: notifyResult.error ?? null,
        updatedAt: new Date(),
      })
      .where(eq(enquiries.id, row.id));

    return { row: { ...row, notificationStatus: notifyResult.status }, created: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await findByIdempotencyKey(input.payload.idempotencyKey);
      if (existing) return { row: existing, created: false };
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  // The driver may wrap the PostgresError (code 23505) in a generic Error
  // with the original in .cause. Walk up to three levels to find it.
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current; depth += 1) {
    if (typeof current === "object") {
      const record = current as { code?: unknown; cause?: unknown };
      if (record.code === "23505") return true;
      current = record.cause;
    } else {
      break;
    }
  }
  return false;
}

export async function findByIdempotencyKey(
  idempotencyKey: string,
): Promise<EnquiryRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(enquiries)
    .where(eq(enquiries.idempotencyKey, idempotencyKey))
    .limit(1);
  return (rows[0] as EnquiryRow | undefined) ?? null;
}

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

export async function listEnquiries(input: {
  actor: SessionUser;
  status?: EnquiryStatus | "all";
  q?: string;
  page: number;
  pageSize: number;
}) {
  assertPermission(input.actor.role, "canAccessEnquiries");
  const db = getDb();

  const conditions = [];
  if (input.status && input.status !== "all") {
    conditions.push(eq(enquiries.status, input.status));
  }
  if (input.q) {
    conditions.push(
      or(
        ilike(enquiries.name, `%${input.q}%`),
        ilike(enquiries.email, `%${input.q}%`),
        ilike(enquiries.publicRef, `%${input.q}%`),
        ilike(enquiries.organisation, `%${input.q}%`),
      )!,
    );
  }

  const rows = await db
    .select({
      id: enquiries.id,
      publicRef: enquiries.publicRef,
      name: enquiries.name,
      organisation: enquiries.organisation,
      email: enquiries.email,
      telephone: enquiries.telephone,
      serviceInterest: enquiries.serviceInterest,
      message: enquiries.message,
      privacyVersion: enquiries.privacyVersion,
      status: enquiries.status,
      assignedToId: enquiries.assignedToId,
      notificationStatus: enquiries.notificationStatus,
      createdAt: enquiries.createdAt,
    })
    .from(enquiries)
    .where(and(...conditions))
    .orderBy(desc(enquiries.createdAt))
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(and(...conditions));

  return { rows, total: countRows[0]?.count ?? 0 };
}

export async function getEnquiry(
  actor: SessionUser,
  id: string,
): Promise<EnquiryRow> {
  assertPermission(actor.role, "canAccessEnquiries");
  const db = getDb();
  const rows = await db
    .select()
    .from(enquiries)
    .where(eq(enquiries.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AppError("not_found", "This enquiry does not exist.");
  return row as EnquiryRow;
}

export async function updateEnquiry(input: {
  actor: SessionUser;
  id: string;
  status?: EnquiryStatus;
  assignedToId?: string | null;
}): Promise<EnquiryRow> {
  assertPermission(input.actor.role, "canAccessEnquiries");
  await getEnquiry(input.actor, input.id);

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.status) set.status = input.status;
  if (input.assignedToId !== undefined) set.assignedToId = input.assignedToId;

  const db = getDb();
  const updated = await db
    .update(enquiries)
    .set(set)
    .where(eq(enquiries.id, input.id))
    .returning();
  return updated[0] as EnquiryRow;
}

export interface ExportOptions {
  status?: EnquiryStatus | "all";
  q?: string;
}

export async function exportEnquiriesCsv(
  actor: SessionUser,
  options: ExportOptions = {},
): Promise<{ csv: string; count: number }> {
  assertPermission(actor.role, "canExportEnquiries");
  const db = getDb();

  const conditions = [];
  if (options.status && options.status !== "all") {
    conditions.push(eq(enquiries.status, options.status));
  }
  if (options.q) {
    conditions.push(
      or(
        ilike(enquiries.name, `%${options.q}%`),
        ilike(enquiries.email, `%${options.q}%`),
        ilike(enquiries.publicRef, `%${options.q}%`),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(enquiries)
    .where(and(...conditions))
    .orderBy(desc(enquiries.createdAt));

  const csv = toCsv(
    [
      "Reference",
      "Created (UTC)",
      "Name",
      "Organisation",
      "Email",
      "Telephone",
      "Service interest",
      "Status",
      "Message",
    ],
    rows.map((row) => [
      row.publicRef,
      row.createdAt.toISOString(),
      row.name,
      row.organisation ?? "",
      row.email,
      row.telephone ?? "",
      row.serviceInterest,
      row.status,
      row.message,
    ]),
  );

  await writeAudit({
    actorId: actor.id,
    action: "enquiry.export",
    entityType: "enquiry",
    metadata: { count: rows.length },
  });

  return { csv, count: rows.length };
}

/** Count enquiries whose notification failed, for the dashboard. */
export async function countNotificationFailures(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(and(eq(enquiries.notificationStatus, "failed"), isNull(enquiries.assignedToId)));
  return rows[0]?.count ?? 0;
}
