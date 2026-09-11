/**
 * Automated check for U+2013 (en dash) and U+2014 (em dash) in authored
 * files and publishable text.
 *
 * Skips third-party dependencies, lockfiles, binary files, generated
 * output, and the untouched source PDF. Exits non-zero when violations
 * are found so it can run in CI.
 *
 * Usage: npm run check:dashes
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "storage",
  "coverage",
  "drizzle", // generated SQL migrations are schema artefacts
]);

const SKIP_EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".lock",
  ".map",
  ".bin",
  ".zip",
  ".gz",
]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "next-env.d.ts",
  "Lalica Company Profile_.pdf",
]);

const FORBIDDEN = ["\u2013", "\u2014"]; // U+2013 en dash, U+2014 em dash

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(full);
    } else if (!SKIP_FILES.has(entry.name) && !SKIP_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

async function main(): Promise<void> {
  const violations: { file: string; line: number; char: string }[] = [];
  for await (const file of walk(ROOT)) {
    let content: string;
    try {
      const buffer = await readFile(file);
      if (buffer.includes(0)) continue; // binary
      content = buffer.toString("utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      for (const char of FORBIDDEN) {
        if (line.includes(char)) {
          violations.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            char: char === "\u2013" ? "U+2013 en dash" : "U+2014 em dash",
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("[dash-check] forbidden dash characters found:");
    for (const violation of violations.slice(0, 50)) {
      console.error(
        `  ${violation.file}:${violation.line} contains ${violation.char}`,
      );
    }
    if (violations.length > 50) {
      console.error(`  and ${violations.length - 50} more`);
    }
    console.error(
      "[dash-check] replace them with commas, colons, parentheses, full stops, or ordinary ASCII hyphens.",
    );
    process.exit(1);
  }

  console.log("[dash-check] no forbidden dash characters found.");
}

main();
