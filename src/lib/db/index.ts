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
import { drizzle as drizzlePostgresJs } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;
export type Schema = typeof schema;

const globalForDb = globalThis as unknown as {
  __lalicaDb?: Db;
  __lalicaSql?: postgres.Sql;
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

export * from "./schema";
