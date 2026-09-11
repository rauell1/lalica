# Lalica Engineering Limited website and CMS

Corporate website and lightweight CMS for Lalica Engineering Limited
(DSM Center, Kahawa West, Nairobi, Kenya).

Status: the application is complete and locally verified (see
docs/acceptance-report.md). Nothing has been deployed to production yet;
follow docs/deployment.md for the first deployment.

## Stack

- Next.js 16 (App Router, TypeScript strict), React 19, Tailwind CSS 4
- PostgreSQL on Neon, Drizzle ORM with checked-in migrations
- Better Auth 1.7.4, invite-only staff access, provider sign-in
- Upstash Redis for distributed rate limiting (fail closed)
- Vercel Blob for CMS image uploads (local file storage in demos)
- Resend for transactional enquiry notifications (optional)
- Cloudflare Turnstile (optional bot challenge on the enquiry form)

## Public site

- / (home), /about, /services plus three service pages, /projects, /csr,
  /news, /contact, /privacy, /admin/login
- Projects and CSR start empty on purpose: index pages show a short
  message with a contact call to action and are noindexed until real
  content exists. The News navigation stays hidden until substantive news
  exists.
- SEO: unique titles and descriptions, one h1 per page, canonicals from
  the configurable production origin, Open Graph images, an XML sitemap
  of substantive published pages only, JSON-LD with verified properties
  only, real 404s, redirects on slug changes, noindex for previews,
  drafts, admin pages, and empty indexes.
- All published copy is verified against the company profile PDF. See
  docs/content-provenance.md for page references.

## Admin CMS

- Role based staff access: Administrator, Editor, Enquiry Manager
- Content editor with structured blocks (headings, paragraphs, lists,
  quotes, callouts, images, dividers), per-type metadata, SEO fields,
  draft and review workflow, version conflict protection, and
  publish/unpublish with automatic cache invalidation
- Enquiries with statuses, assignment, CSV export (formula injection
  neutralised), notification retry, and audited retention purge
- Media library with signature-verified uploads, server-side file
  signature checks, and draft/published visibility
- Settings, user management (last active administrator protection), and
  an audit log

## Local development

Requirements: Node.js 22 or newer, Python 3 with a virtual environment
for the local database tooling.

```bash
# 1. Python tooling (pgserver for the local PostgreSQL)
python3 -m venv /home/user/.venv
/home/user/.venv/bin/pip install pgserver pymupdf

# 2. Dependencies
npm install

# 3. Local database (starts PostgreSQL on 127.0.0.1:5432, database lalica)
/home/user/.venv/bin/python3 scripts/local-db.py

# 4. Environment
cp .env.example .env.local
# Set DATABASE_URL=postgresql://postgres@127.0.0.1:5432/lalica
# Set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
# Keep AUTH_DEMO_MODE_ENABLED=true for the labelled local demo

# 5. Migrate and seed (idempotent, verified content only)
npm run db:migrate
npm run db:seed

# 6. Run
npm run dev
```

Demo sign-in (local only, clearly labelled): use the demo buttons on
/admin/login. Production builds reject demo authentication entirely.

## Scripts

| Command | Purpose |
| --- | --- |
| npm run dev / build / start | Development and production Next.js |
| npm run typecheck | TypeScript strict check |
| npm test | Vitest suite (unit + live database integration, 68 tests) |
| npm run check:dashes | Forbidden dash character check for authored files |
| npm run db:generate | Generate a Drizzle migration from schema changes |
| npm run db:migrate | Apply checked-in migrations (idempotent, advisory locked) |
| npm run db:seed | Idempotent seed with verified content only |
| npm run admin:bootstrap | One-time first administrator promotion |
| npm run content:export | Export published content as JSON |
| npm run enquiries:purge | Retention deletion for resolved enquiries |

## Documentation

| Document | Contents |
| --- | --- |
| docs/acceptance-report.md | The 22 acceptance flows with actual results |
| docs/authentication.md | Sign-in setup, roles, and the first administrator |
| docs/deployment.md | Vercel and Neon deployment, environments, costs |
| docs/operations.md | Backups, restore, exports, media recovery, rollback |
| docs/admin-guide.md | Short nontechnical guide for staff |
| docs/content-provenance.md | Every published claim mapped to PDF pages |
| docs/content-verification.md | Unresolved facts and asset rights checklist |
| docs/assets-manifest.md | Extracted logo and imagery with rights notes |

## Security notes

- Secrets never in the repository, cache, browser, or logs (see
  .env.example for the full list).
- Role checks live in the server-side data access layer, on every
  protected action and endpoint.
- Parameterised queries only; structured rich text blocks only (no
  arbitrary HTML, MDX, or JavaScript); uploads restricted to JPEG, PNG,
  and WebP with server-side signature verification; HTTP-only Secure
  cookies; CSRF via SameSite and origin checks; security headers and a
  practical CSP.
- The production rate limiter is Upstash Redis with atomic counters.
  If it is unavailable, public submissions and sensitive mutations fail
  closed while cacheable public pages stay up.
