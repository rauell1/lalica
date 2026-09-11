/**
 * Database client factory.
 *
 * Neon PostgreSQL connection strings (neon:// or neondb_...) use the
 * Neon serverless driver, which is built for serverless execution and
 * also runs on Vercel edge compatible runtimes. Plain postgres:// URLs
 * (the local development server, or a Neon pooled connection when running
 * scripts and migrations) use postgres.js with prepared statements
 * disabled, which is the recommended approach for PgBouncer.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import postgres from "postgres";
import {
  drizzle as drizzlePostgresJs,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;
export type Schema = typeof schema;
export type AppDb = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __lalicaDb?: Db;
  __lalicaSql?: postgres.Sql;
  __lalicaAppDb?: AppDb;
};

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Set it to your Neon PostgreSQL connection string.",
    );
  }

  if (url.startsWith("neon://") || url.startsWith("neondb_")) {
    const client = neon(url, { fullResults: true });
    return drizzleNeon(client, { schema });
  }

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    // Used for the local development database and for Neon pooled
    // connections. Prepared statements are disabled because PgBouncer in
    // transaction mode does not support them. The runtime query builder API
    // is compatible with the Neon HTTP database type.
    const client = postgres(url, {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
    });
    globalForDb.__lalicaSql = client;
    return drizzlePostgresJs(client, {
      schema,
    }) as unknown as NeonHttpDatabase<typeof schema>;
  }

  throw new Error(
    "DATABASE_URL has an unsupported scheme. Use a Neon connection string " +
      "(neon:// or neondb_...) or a postgres:// URL.",
  );
}

export function getDb(): Db {
  if (!globalForDb.__lalicaDb) {
    globalForDb.__lalicaDb = createDb();
  }
  return globalForDb.__lalicaDb;
}

/** Access the raw postgres.js client when available (scripts, tests). */
export function getRawSql(): postgres.Sql | null {
  return globalForDb.__lalicaSql ?? null;
}

/**
 * Restricted, non-owner Postgres role the running app connects as, so Row
 * Level Security policies (drizzle/0001_rls.sql) actually apply — they are
 * not evaluated for the table owner used by getDb()/DATABASE_URL. Falls
 * back to DATABASE_URL when APP_DATABASE_URL is unset (scripts, tests),
 * which is fine there but never for the deployed app.
 */
function getAppDb(): AppDb {
  if (!globalForDb.__lalicaAppDb) {
    const url = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "APP_DATABASE_URL (or DATABASE_URL) is not configured.",
      );
    }
    const client = postgres(url, {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
    });
    globalForDb.__lalicaAppDb = drizzlePostgresJs(client, { schema });
  }
  return globalForDb.__lalicaAppDb;
}

/**
 * Runs `fn` inside a transaction on the restricted app_runtime connection
 * with `app.user_id` set for the duration of that transaction only, so the
 * Postgres RLS policies in drizzle/0001_rls.sql can identify the caller
 * (`app.current_user_id()`) and re-derive their role from the `users`
 * table (`app.current_role()`). This is the second, database-level
 * enforcement layer underneath `assertPermission`/`hasPermission` — it
 * does not replace those checks, it backstops them.
 */
export async function runAsActor<T>(
  actorId: string,
  fn: (db: AppDb) => Promise<T>,
): Promise<T> {
  const db = getAppDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${actorId}, true)`);
    return fn(tx);
  });
}

/**
 * Public/anonymous reads on the restricted app_runtime connection, with no
 * actor context set. RLS's public_read policies (status = 'published')
 * apply automatically. Use for the cached public site reads instead of
 * getDb(), so a bug in query construction cannot leak unpublished content
 * past the database layer.
 */
export function getPublicDb(): AppDb {
  return getAppDb();
}

export * from "./schema";
