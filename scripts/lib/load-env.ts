/**
 * Load .env.local for scripts run outside the Next.js runtime.
 */

import path from "node:path";
import process from "node:process";

export function loadLocalEnv(): void {
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
  ];
  for (const candidate of candidates) {
    try {
      process.loadEnvFile(candidate);
      return;
    } catch {
      // File does not exist; continue.
    }
  }
}
