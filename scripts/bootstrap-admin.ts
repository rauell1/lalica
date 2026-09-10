/**
 * One-time first administrator bootstrap.
 *
 * Process:
 * 1. Configure the identity provider (for example Google) and deploy.
 * 2. The owner signs in once through /admin/login. The account is created
 *    inactive with no role, so it has no access yet.
 * 3. Run this script with the owner's exact sign-in email:
 *    ADMIN_BOOTSTRAP_EMAIL=owner@example.com ADMIN_BOOTSTRAP_TOKEN=yes npm run admin:bootstrap
 * 4. The account becomes an active administrator. The action is written to
 *    the audit log.
 *
 * No default password exists anywhere, and the first arbitrary login never
 * receives administrator access.
 */

import { eq } from "drizzle-orm";

import { loadLocalEnv } from "./lib/load-env";

loadLocalEnv();

async function main(): Promise<void> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const token = process.env.ADMIN_BOOTSTRAP_TOKEN;

  if (!email) {
    console.error(
      "Set ADMIN_BOOTSTRAP_EMAIL to the exact email of the account that already signed in once.",
    );
    process.exit(1);
  }
  if (token !== "yes") {
    console.error(
      "This is a sensitive one-time operation. Re-run with ADMIN_BOOTSTRAP_TOKEN=yes to confirm.",
    );
    process.exit(1);
  }

  const { getDb, users } = await import("../src/lib/db");
  const { writeAudit } = await import("../src/lib/audit/service");
  const db = getDb();

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];
  if (!user) {
    console.error(
      `No account found for ${email}. Sign in once through the website first so the account exists, then run this script again.`,
    );
    process.exit(1);
  }

  await db
    .update(users)
    .set({ role: "administrator", active: true, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await writeAudit({
    actorId: user.id,
    action: "user.bootstrap_admin",
    entityType: "user",
    entityId: user.id,
    metadata: { email },
  });

  console.log(`[bootstrap] ${email} is now an active administrator.`);
  console.log(
    "[bootstrap] Next steps: sign in at /admin/login, then invite other staff from the admin Users page. Enable two-factor authentication on the identity provider account.",
  );
}

main().catch((error) => {
  console.error("[bootstrap] failed:", error);
  process.exit(1);
});
