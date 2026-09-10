/**
 * Content export for backup and migration purposes.
 *
 * Writes all content, settings, and media metadata rows as JSON to
 * stdout (redirect to a file). Does not export enquiry messages, user
 * emails, sessions, or audit metadata beyond what is printed. See
 * docs/operations.md for the backup and restore runbook.
 *
 * Usage: npm run content:export > content-export-YYYYMMDD.json
 */

import { loadLocalEnv } from "./lib/load-env";

loadLocalEnv();

async function main(): Promise<void> {
  const { getDb, content, siteSettings, media } = await import("../src/lib/db");
  const db = getDb();

  const [contentRows, settingsRows, mediaRows] = await Promise.all([
    db.select().from(content),
    db.select().from(siteSettings),
    db.select({
      id: media.id,
      storageKey: media.storageKey,
      storageProvider: media.storageProvider,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      width: media.width,
      height: media.height,
      altText: media.altText,
      caption: media.caption,
      sourceNote: media.sourceNote,
      rightsStatus: media.rightsStatus,
      status: media.status,
      createdAt: media.createdAt,
    }).from(media),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    app: "lalica-website",
    content: contentRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    })),
    settings: settingsRows,
    media: mediaRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main().catch((error) => {
  console.error("[export] failed:", error);
  process.exit(1);
});
