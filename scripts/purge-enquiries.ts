/**
 * Retention deletion process for enquiries.
 *
 * Deletes resolved enquiries older than ENQUIRY_RETENTION_DAYS (default
 * 365). The deletion is written to the audit log. Run this manually or on
 * a schedule; see docs/operations.md.
 *
 * Usage: ENQUIRY_RETENTION_DAYS=365 npm run enquiries:purge
 */

import { and, eq, lt } from "drizzle-orm";

import { loadLocalEnv } from "./lib/load-env";

loadLocalEnv();

async function main(): Promise<void> {
  const days = Number(process.env.ENQUIRY_RETENTION_DAYS ?? "365");
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { getDb, enquiries } = await import("../src/lib/db");
  const { writeAudit } = await import("../src/lib/audit/service");
  const db = getDb();

  const before = await db
    .select({ count: enquiries.id })
    .from(enquiries)
    .where(and(eq(enquiries.status, "resolved"), lt(enquiries.createdAt, cutoff)));

  await db
    .delete(enquiries)
    .where(and(eq(enquiries.status, "resolved"), lt(enquiries.createdAt, cutoff)));

  await writeAudit({
    action: "enquiry.purge",
    entityType: "enquiry",
    metadata: { cutoff: cutoff.toISOString(), candidates: before.length },
  });

  console.log(
    `[purge] deleted ${before.length} resolved enquiries older than ${cutoff.toISOString()}.`,
  );
}

main().catch((error) => {
  console.error("[purge] failed:", error);
  process.exit(1);
});
