/**
 * Audit log service.
 *
 * Records publishing, unpublishing, deletion, role changes, settings
 * updates, and enquiry exports. Metadata is minimal: never passwords,
 * tokens, full enquiry messages, or unnecessary personal information.
 */

import { and, desc, eq, sql, type SQL } from "drizzle-orm";

import { getDb, auditLog } from "@/lib/db";
import { redactEmail } from "@/lib/utils/text";

export interface AuditMeta {
  [key: string]: unknown;
}

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: AuditMeta;
}): Promise<void> {
  try {
    const db = getDb();
    await db.insert(auditLog).values({
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: sanitiseMetadata(input.metadata ?? {}),
    });
  } catch (error) {
    // Audit failures must never break the action being performed, but
    // they are logged so operators can see the audit trail is incomplete.
    console.error("[audit] failed to write audit entry", error);
  }
}

function sanitiseMetadata(metadata: AuditMeta): AuditMeta {
  const out: AuditMeta = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key === "email") {
      out[key] = typeof value === "string" ? redactEmail(value) : value;
      continue;
    }
    if (typeof value === "string" && value.length > 500) {
      out[key] = `${value.slice(0, 200)}... (truncated)`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export interface AuditFilters {
  entityType?: string;
  actorId?: string;
  page: number;
  pageSize: number;
}

export async function listAudit(filters: AuditFilters) {
  const db = getDb();
  const conditions: SQL[] = [];
  if (filters.entityType) {
    conditions.push(eq(auditLog.entityType, filters.entityType));
  }
  if (filters.actorId) {
    conditions.push(eq(auditLog.actorId, filters.actorId));
  }

  const rows = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return {
    rows: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      metadata: row.metadata as AuditMeta,
    })),
    total: countRows[0]?.count ?? 0,
  };
}
