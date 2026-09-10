# Operations: backup, restore, exports, and recovery

## Database backups (Neon)

Neon keeps point in time recovery and branching built in.

- Automated: enable Neon's PITR and branch protection on the production
  database. Point in time recovery covers accidental deletes.
- Scheduled logical backup: run a pg_dump of the production database on a
  schedule you control (weekly is a sensible start for a small site), and
  keep the dumps outside Neon as an extra independent copy.

  ```bash
  pg_dump "$DATABASE_URL" --no-owner --no-privileges -Fc > lalica-backup-$(date +%F).dump
  ```

- Before any risky operation, create a Neon branch of production and test
  against it. Branches are also the fastest full restore: create a branch
  at the desired point in time and repoint the application at it.

## Restore from a logical dump

```bash
createdb lalica_restore   # or create a fresh database in Neon
pg_restore --no-owner --no-privileges -d "$RESTORE_DATABASE_URL" lalica-backup-2026-09-10.dump
```

Then update DATABASE_URL (or the Vercel environment) to the restored
database, redeploy, and verify the admin area and public pages.

## Content export

Every content item keeps its full history in the JSONB columns: the
current draft, the published snapshot, status, and version. Export a
readable copy at any time:

```bash
npm run content:export
```

The script writes the published content, settings, and enquiry metadata to
a local export file. Use it for offline review or as an extra copy before
bulk changes. (See scripts/export-content.ts for the exact output path.)

## Media recovery

- Media files live in Vercel Blob (production) or ./storage/media (local
  demo). The database stores only metadata and storage keys, never bytes.
- Blob is durable in the Vercel account. For an extra safety copy, export
  the media list from the admin media library and download the public
  files, or script a copy using the Blob SDK with the read/write token.
- If a media row is deleted by mistake while the file still exists in
  Blob, the file can be re-imported: upload it again through the admin
  media library and update any content that referenced the old media id
  (content stores media ids in its blocks and galleries).
- Deletion is blocked while any published content references an image, so
  accidental loss through the CMS is prevented.

## Content rollback inside the CMS

- Every publish stores a frozen published snapshot. To undo an accidental
  publish or edit: open the item in the CMS, copy the previous text from
  the published snapshot view, save as draft, and publish again. For a
  clean removal, unpublish, which instantly removes the page from the
  public site, sitemap, and caches.
- Slug changes register redirects automatically, so changing a published
  slug never breaks old links.

## Enquiry retention and deletion

- Resolved enquiries are deleted by a dedicated script, never silently:

  ```bash
  ENQUIRY_RETENTION_DAYS=365 npm run enquiries:purge
  ```

- The script deletes only resolved enquiries older than the cutoff, logs
  the count to the audit log, and prints what it deleted. Run it on a
  schedule or by hand. The default retention is 365 days and is
  configurable through ENQUIRY_RETENTION_DAYS. The privacy policy page
  describes the current retention to visitors; keep the two in sync.

## Cache behaviour

- Public pages are cached for up to one hour and invalidated immediately
  on publish, unpublish, and settings changes. Draft previews never enter
  public caches. No manual cache operation is needed in normal use.
- If a page ever looks stale after a publish, the publish already ran the
  invalidation; a hard refresh of the browser (and one hour at most for
  any remaining edge cache) resolves it.

## Rate limiter operations

- Production uses Upstash Redis with atomic counters and expiry. If
  Upstash is unreachable, public submissions and sensitive mutations fail
  closed with a temporary error while public pages stay available.
- Limiter identifiers are HMAC hashed with the server secret, so raw IP
  addresses and emails are never stored in Redis. Limits are configured in
  src/lib/ratelimit/index.ts (enquiry per IP, per email, sign-in
  attempts, admin mutations, upload authorisations, exports).

## Logs and audit

- The audit log records content lifecycle, user changes, settings
  changes, exports, and purge operations. View the last 200 entries in
  the admin audit page. The log is append only in the application; treat
  the database table itself as the source of truth in disputes.
