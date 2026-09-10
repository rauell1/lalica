/**
 * Apply checked-in database migrations.
 *
 * Run this as a controlled deployment step (for example in the Vercel
 * build command before `next build`), never on every request. The runner
 * uses an advisory lock so concurrent deploys cannot apply the same
 * migration twice.
 *
 * Usage: npm run db:migrate
 */

import { loadLocalEnv } from "./lib/load-env";

loadLocalEnv();

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }
  const { runMigrations } = await import("../src/lib/db/migrate");
  console.log(`[migrate] applying migrations to ${redactUrl(url)}...`);
  await runMigrations(url);
  console.log("[migrate] done.");
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.password = parsed.password ? "***" : "";
    return parsed.toString();
  } catch {
    return "(redacted)";
  }
}

main().catch((error) => {
  console.error("[migrate] failed:", error);
  process.exit(1);
});
