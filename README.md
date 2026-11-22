<!-- header:start -->
<div align="center">

# Lalica Engineering

**Corporate website and lightweight CMS for Lalica Engineering Limited, Nairobi.**

[![Live: lalica.rauell.workers.dev](https://img.shields.io/badge/Live-lalica.rauell.workers.dev-0d9488?style=for-the-badge&logo=cloudflare&logoColor=white)](https://lalica.rauell.workers.dev) ![Status: live](https://img.shields.io/badge/Status-Live-2ea44f?style=for-the-badge) ![Public repository](https://img.shields.io/badge/Repo-Public-555555?style=for-the-badge&logo=github)

![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white) ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![Drizzle](https://img.shields.io/badge/Drizzle-c5f74f?style=flat-square&logo=drizzle&logoColor=white) ![Neon Postgres](https://img.shields.io/badge/Neon_Postgres-00e599?style=flat-square&logo=postgresql&logoColor=white) ![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-f38020?style=flat-square&logo=cloudflare&logoColor=white)

[Live site](https://lalica.rauell.workers.dev) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Code of conduct](CODE_OF_CONDUCT.md)

</div>

---
<!-- header:end -->

Corporate website and lightweight CMS for Lalica Engineering Limited
(DSM Center, Kahawa West, Nairobi, Kenya).

Status: the application is complete and verified (see
docs/acceptance-report.md). It runs on Cloudflare Workers at
https://lalica.rauell.workers.dev; see docs/deployment.md.

## Stack

- Next.js 16 (App Router, TypeScript strict), React 19, Tailwind CSS 4
- PostgreSQL on Neon, Drizzle ORM with checked-in migrations
- Better Auth 1.7.4, invite-only staff access, provider sign-in
- Upstash Redis for distributed rate limiting (fail closed)
- Neon object storage for CMS image uploads (Vercel Blob for older uploads, local file storage in demos)
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

## Project information

| | |
|---|---|
| Live site | https://lalica.rauell.workers.dev |
| Hosting | Cloudflare Workers |
| Default branch | `main` |
| Repository | Public |

### Stack

- Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4
- Drizzle ORM with Neon PostgreSQL
- Better Auth for the admin CMS
- Upstash rate limiting, Resend email
- Vitest for tests

### Deployment

Production runs on Cloudflare Workers at https://lalica.rauell.workers.dev. `.github/workflows/deploy-cloudflare.yml` builds and deploys on every push to `main`, using the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. Public build-time values are repository variables; runtime secrets are Worker secrets.

### Contributing and security

- How to set up, test and submit changes: [CONTRIBUTING.md](CONTRIBUTING.md)
- How to report a vulnerability: [SECURITY.md](SECURITY.md)
- Expected behaviour in project spaces: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

### Licence

No open-source licence has been granted. The code, content and brand assets belong to the project owner and all rights are reserved. Ask the owner before reusing any part of this repository.
