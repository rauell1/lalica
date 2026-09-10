/**
 * Idempotent seed: inserts verified company content only, and only where
 * rows do not already exist, so re-running never overwrites admin edits.
 * Demo staff accounts are only created when demo mode is enabled.
 *
 * Usage: npm run db:seed
 */

import { eq, and, sql } from "drizzle-orm";

import { loadLocalEnv } from "./lib/load-env";

loadLocalEnv();

async function main(): Promise<void> {
  const { getDb, siteSettings, users, content } = await import("../src/lib/db");
  const { SEED_SETTINGS, SEED_SERVICES, SEED_SYSTEM_USER, SEED_DEMO_USERS } =
    await import("../src/lib/seed-data");
  const { writeAudit } = await import("../src/lib/audit/service");
  const { parseDraft } = await import("../src/lib/content/types");

  const db = getDb();

  // System user referenced by seeded content and audit rows.
  await db
    .insert(users)
    .values({
      id: SEED_SYSTEM_USER.id,
      subject: SEED_SYSTEM_USER.subject,
      name: SEED_SYSTEM_USER.name,
      email: SEED_SYSTEM_USER.email,
      emailVerified: false,
      role: null,
      active: false,
    })
    .onConflictDoNothing();

  // Settings: insert only when missing so admin edits are preserved.
  for (const [key, value] of Object.entries(SEED_SETTINGS)) {
    await db
      .insert(siteSettings)
      .values({ key, value, updatedById: SEED_SYSTEM_USER.id })
      .onConflictDoNothing();
  }
  const settingsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(siteSettings);
  console.log(`[seed] settings rows present: ${settingsCount[0]?.count ?? 0}`);

  // The three verified service pages, published at seed time.
  for (const service of SEED_SERVICES) {
    const draft = parseDraft("service", service.draft);
    const snapshot = {
      ...draft,
      publishedAt: new Date().toISOString(),
      publishedById: SEED_SYSTEM_USER.id,
    };
    const result = await db
      .insert(content)
      .values({
        type: "service",
        slug: draft.slug,
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        draft,
        publishedSnapshot: snapshot,
        status: "published",
        coverMediaId: null,
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        metadata: draft.metadata,
        createdById: SEED_SYSTEM_USER.id,
        updatedById: SEED_SYSTEM_USER.id,
        publishedAt: new Date(),
        version: 1,
      })
      .onConflictDoNothing();
  }
  const servicesCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(content)
    .where(and(eq(content.type, "service"), eq(content.status, "published")));
  console.log(`[seed] published service pages present: ${servicesCount[0]?.count ?? 0}`);

  // Demo staff accounts: local demonstrations only.
  if (process.env.AUTH_DEMO_MODE_ENABLED === "true") {
    for (const demo of SEED_DEMO_USERS) {
      await db
        .insert(users)
        .values({
          id: `demo-user-${demo.role}`,
          subject: demo.subject,
          name: demo.name,
          email: demo.email,
          emailVerified: true,
          role: demo.role,
          active: true,
        })
        .onConflictDoNothing();
    }
    console.log("[seed] demo staff accounts ensured (3 roles).");
  } else {
    console.log(
      "[seed] demo mode disabled (AUTH_DEMO_MODE_ENABLED != true): no demo accounts created.",
    );
  }

  // Verify nothing seeded contains a forbidden dash character.
  const { findDashViolations } = await import("../src/lib/utils/text");
  const violations = findDashViolations({ SEED_SETTINGS, SEED_SERVICES });
  if (violations.length > 0) {
    console.error("[seed] forbidden dash characters found in seed data:", violations);
    process.exit(1);
  }

  await writeAudit({
    actorId: SEED_SYSTEM_USER.id,
    action: "seed.run",
    entityType: "system",
    metadata: {},
  });

  // Sanity check the content table.
  const counts = await db
    .select({ type: content.type })
    .from(content)
    .where(and(eq(content.status, "published"), eq(content.type, "service")));
  console.log(`[seed] published services now in database: ${counts.length}`);
  console.log("[seed] done.");
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
