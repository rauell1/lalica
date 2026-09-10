/**
 * Migration runner used by scripts and the documented deployment step.
 * Migrations are checked in under /drizzle and applied through a
 * controlled deployment step, never on every request.
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function runMigrations(
  url: string,
  migrationsFolder = "drizzle",
): Promise<void> {
  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
  });
  try {
    // Serialise migration runs with an advisory lock so two deployment
    // steps cannot apply the same migration at the same time.
    await client`select pg_advisory_lock(76412)`;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client`select pg_advisory_unlock(76412)`.catch(() => undefined);
    await client.end();
  }
}
