import { defineConfig } from "drizzle-kit";

// Used by drizzle-kit generate to produce checked-in SQL migrations.
// Generation is local; the URL is only needed for introspect/push workflows.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres@127.0.0.1:5432/lalica",
  },
});
