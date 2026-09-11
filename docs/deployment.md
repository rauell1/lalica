# Deployment guide

Status note: as of 10 September 2026 nothing has been deployed yet. This
guide describes the planned and tested procedure; any step marked
"verified" refers to local verification only. Update this file after the
first real deployment.

## Architecture

One Next.js application on Vercel. One Neon PostgreSQL database per
environment. Vercel Blob for CMS image storage, Upstash Redis for
distributed rate limiting, Resend for transactional enquiry notifications,
Cloudflare Turnstile (optional) for bot challenge on the public enquiry
form. No microservices, no separate CMS server.

## Environments

Create two separate sets of everything so previews can never touch
production data:

| Resource | Production | Preview |
| --- | --- | --- |
| Vercel project | Production environment of the project | Preview deployments of the same project |
| Neon database | One production branch/database | One separate database |
| Vercel Blob store | Production store | Separate store |
| Upstash database | Production database | Separate database (or omit; see below) |
| Resend API key | Production key, live sending | Leave unset so previews never send real mail |
| Turnstile | Production site and secret | Leave unset or use test keys |
| Demo mode | Never set | Never needed (previews use the same provider login) |

Previews run with `AUTH_DEMO_MODE_ENABLED` unset, so no preview ever
offers demo sign-in, and preview environments with no Resend key store
enquiries without sending notifications (they are flagged in the admin
area instead). Preview and production have different DATABASE_URL,
BETTER_AUTH_SECRET, Blob, and Upstash values, so preview data and
production data never mix.

## Step by step

### 1. Neon PostgreSQL

1. Create a Neon project. For production choose a region near Nairobi
   traffic (for example Frankfurt).
2. Create the production database and a separate preview database.
3. For the application, use the unpooled (direct) connection string.
4. Migrations run through the deployment step below and never on request.
   The runner takes an advisory lock so concurrent deploys cannot apply
   the same migration twice. All migrations are checked in under
   /drizzle, including drizzle/0001_rls.sql, which enables Row Level
   Security on the six business tables and creates a second, restricted
   Postgres role, app_runtime, that the running app connects as (see
   "Row Level Security" in docs/authentication.md). After the migration
   runs for a new database, set app_runtime's password directly
   (`ALTER ROLE app_runtime PASSWORD '...';`, generated fresh, never
   committed) and set APP_DATABASE_URL with those credentials before the
   app serves real traffic.

### 2. Upstash Redis

1. Create a Redis database (global region is fine for rate limiting).
2. Copy the REST URL and REST token into the Vercel environment.
3. Without Upstash, production fails closed for public submissions and
   sensitive mutations: enquiries return a temporary 503 style message,
   admin mutations are refused, while cacheable public pages stay up. The
   in-memory limiter is for local demos only (there is an escape hatch
   ALLOW_LOCAL_LIMITER for closed acceptance environments, documented in
   .env.example).

### 3. Vercel Blob

1. Create a Blob store in the Vercel dashboard.
2. Copy the read/write token into BLOB_READ_WRITE_TOKEN.
3. Without it, image uploads are disabled with a clear error in the admin
   media library. Local demos write to ./storage instead.

### 4. Resend

1. Create a Resend account, verify the sending domain, and verify the
   FROM address.
2. Set RESEND_API_KEY, EMAIL_FROM, EMAIL_TO in production only.
3. If notification sending fails at runtime, the enquiry is still stored
   and flagged; the admin area shows the failure and offers a retry.

### 5. Vercel project

1. Import the repository into a new Vercel project.
2. Set the framework preset to Next.js (detected automatically).
3. Build command:
   `npm run db:migrate && next build`
   (or `npm run db:migrate && npm run build`). The migration step is
   idempotent and safe to run on every deployment.
4. Node.js 22.x or newer (the app was developed and verified on Node 22).
5. Add the environment variables below separately for Production and for
   Preview, with different secrets and different databases.

### 6. Environment variables

| Variable | Production | Preview |
| --- | --- | --- |
| DATABASE_URL | Production Neon, unpooled | Preview Neon |
| APP_DATABASE_URL | app_runtime role, same database as DATABASE_URL | app_runtime role, preview database |
| BETTER_AUTH_SECRET | Long random secret | Different random secret |
| PUBLIC_APP_URL | https://your-domain after ownership is verified | Vercel preview URL (set by Vercel automatically when left empty; keep it unset to use the preview URL) |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Production OAuth client | Same client with preview origins authorised, or a separate test client |
| UPSTASH_REDIS_REST_URL / TOKEN | Production Upstash | Optional separate Upstash, else omitted and preview submissions fail closed |
| BLOB_READ_WRITE_TOKEN | Production Blob | Preview store token (or omitted: previews then refuse uploads) |
| RESEND_API_KEY / EMAIL_FROM / EMAIL_TO | Production values | Leave unset (no real notifications from previews) |
| ENQUIRY_TURNSTILE_SECRET / NEXT_PUBLIC_ENQUIRY_TURNSTILE_SITE_KEY | Production Turnstile | Leave unset (honeypot and rate limiting still apply) |
| ENQUIRY_RETENTION_DAYS | 365 | Any |
| AUTH_ALLOW_EMAIL_PASSWORD | false | false |
| AUTH_DEMO_MODE_ENABLED | Never set | Never set |
| ALLOW_LOCAL_LIMITER | Never set | Never set |

Production fails fast with a clear configuration error when DATABASE_URL,
BETTER_AUTH_SECRET, or PUBLIC_APP_URL are missing. Secrets never appear in
the repository, in client bundles, or in logs. See .env.example for the
full annotated list.

### 7. Domain and origin

- Do not assume the printed domain www.lalicaengineering.com is
  accessible or controlled. Connect the real domain in the Vercel
  dashboard and verify ownership there.
- Only after the domain is verified and connected, set PUBLIC_APP_URL to
  the final origin. Canonical URLs, Open Graph metadata, and the sitemap
  all derive from it, so changing it later is safe (the sitemap and
  canonicals follow automatically).

### 8. First administrator

Follow docs/authentication.md (Google sign-in once, then the one-time
bootstrap script). No default password exists.

## Provider costs and plan eligibility

Indicative pricing as of September 2026. Confirm current prices on each
provider's site before committing.

| Provider | Free tier | Paid tier needed for production | Indicative cost |
| --- | --- | --- | --- |
| Vercel | Hobby, but restricted to non-commercial personal use | Pro or Enterprise. A business website is commercial use, so Pro is the eligible commercial plan | Pro: USD 20 per developer seat per month, with usage based allowances |
| Neon | Free tier database | Scale plan for production reliability | Starts around USD 19 per month for the Scale plan |
| Upstash | Small free tier | Pay as you go above the free allowance | Small Redis usage typically a few dollars per month |
| Vercel Blob | Included allowance on paid plans | Usage based beyond allowance | Per GB stored and per operation, usually low for a brochure site |
| Resend | 3,000 emails per month | Usage based above that | Enquiry volume for this site typically fits the free tier |
| Cloudflare Turnstile | Free | None | Free |

The Vercel Hobby plan is not eligible for this site because Vercel's fair
use policy restricts Hobby accounts to non-commercial personal use, and a
corporate website is commercial. Use the Pro plan on a Vercel team, and
keep the client as the owner of the team and billing.

## After the first deployment

1. Verify the public pages, sitemap, and robots.txt on the production
   domain.
2. Verify that /admin/login shows the Google button and no demo buttons.
3. Verify enquiry submissions store and notify (send one test enquiry,
   then delete it from the admin area).
4. Upload one test image in the media library, then delete it.
5. Record the successful deployment in docs/content-verification.md and
   update the status note at the top of this file.

## Rolling back a deployment

Vercel keeps every deployment. In the Vercel dashboard, open Deployments,
find the last known good deployment, and choose Promote to production (or
roll back to the instant rollback). Database migrations are append only
and do not need reversal for a code rollback. Content rollback uses the
versioned published snapshots; see docs/operations.md.
