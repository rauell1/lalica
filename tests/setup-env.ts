/**
 * Loads local development variables from .env.local before any application
 * module is imported. Mirrors what `next dev` does locally. Production
 * integration tests must be run against a dedicated test environment.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");

try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // No .env.local: the tests that need environment variables will fail
  // with the same clear messages as the runtime does.
}

// Vitest sets NODE_ENV to "test" itself; nothing more to do here.
