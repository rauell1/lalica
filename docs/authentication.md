# Authentication and staff access

## How access works

- The site uses Better Auth 1.7.4 (a maintained TypeScript authentication
  library) with its Drizzle adapter, on top of the same Neon PostgreSQL
  database as the CMS.
- There is no public registration. Every new sign-in creates an account
  that starts inactive with no role. It has no access to anything until an
  administrator activates it and assigns a role.
- Staff sign in with a configured identity provider. Google sign-in is the
  supported default. An optional email/password fallback exists but is
  disabled by default.
- Sessions last 7 days, cookies are HttpOnly with SameSite=Lax (Secure on
  production origins), and a signed session cache keeps every request
  authenticated against the database.
- The last active Administrator cannot be deactivated or demoted from the
  admin area, so the site can never lock itself out.

## Roles

| Role | Can do |
| --- | --- |
| Administrator | Everything: publish and unpublish, manage users and roles, edit settings, media, enquiries, audit |
| Editor | Create and edit drafts, submit for review, upload and manage media, preview drafts. Cannot publish, manage users, edit settings, or see enquiries |
| Enquiry Manager | View, filter, assign, and export enquiries only |

Every protected action checks the role again on the server. Hidden buttons
and redirects are convenience only; the data access layer is the security
boundary.

## One-time setup: Google sign-in

1. In Google Cloud Console, create OAuth client credentials for a Web
   application.
2. Add the authorised callback URL:
   `{PUBLIC_APP_URL}/api/auth/callback/google`.
3. Add the authorised JavaScript origins: the production origin and the
   preview origins you use for testing.
4. In Vercel project settings (production environment), set
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. Redeploy. The Google button appears on /admin/login automatically.
6. Sign in once with the owner's Google account. The account is created
   inactive with no role.
7. Run the one-time bootstrap with the exact email of that sign-in:

   ```bash
   ADMIN_BOOTSTRAP_EMAIL=owner@gmail.com ADMIN_BOOTSTRAP_TOKEN=yes npm run admin:bootstrap
   ```

   The script refuses to run without the confirmation token, only promotes
   an account that already signed in, and writes the promotion to the
   audit log. There is no default password anywhere.
8. The owner is now the first Administrator. They activate and assign
   roles to other staff from the admin Users page after those staff sign
   in once.

## Email/password fallback (optional)

- Controlled by `AUTH_ALLOW_EMAIL_PASSWORD`. Keep it disabled unless there
  is a real need and an email delivery provider configured.
- When enabled, accounts require email verification, and new accounts
  still start inactive with no role, so enabling it does not create a
  public registration path.

## Multi-factor authentication

- The authentication library supports two-factor authentication as a
  plugin. This build does not enable that plugin yet, so do not claim it
  is active.
- The practical MFA today is provider supported: enforce two-step
  verification in Google Workspace (or on the owner's Google account)
  under Security settings. Staff Google accounts then require a second
  step before the site session can be created.
- Enabling the library's own two-factor plugin is a small follow-up task
  (add the plugin, a setup page, and an environment flag) and can be
  scheduled before go-live if provider side MFA is not enough.

## Local demo mode (clearly labelled)

- For local development only, `AUTH_DEMO_MODE_ENABLED=true` in .env.local
  shows demo sign-in buttons on /admin/login and enables the
  /api/auth/demo-signin route for the three seeded demo staff accounts.
- The route returns 404 whenever NODE_ENV is production or the flag is
  unset, and the login page only renders demo buttons outside production.
  Production startup rejects demo authentication entirely; there is no
  code path that creates demo sessions in production.

## Session and cookie details

| Setting | Value |
| --- | --- |
| Session lifetime | 7 days |
| Cookie flags | HttpOnly, SameSite=Lax, Secure on https origins |
| Cookie name | better-auth.session_token |
| Signing | HMAC-SHA256 with BETTER_AUTH_SECRET |
| Cookie cache | Signed session cache, 5 minutes, verified against the database |

Rotating BETTER_AUTH_SECRET signs out everyone. Generate it with
`openssl rand -base64 32` and store it only in the Vercel environment, never
in the repository.

## Row Level Security (second, database level enforcement layer)

Every protected action is checked twice: once in application code
(`assertPermission`/`hasPermission` in `src/lib/auth/roles.ts`, as above),
and again inside Postgres itself. A bug in the first layer can no longer, on
its own, leak or corrupt data.

- **Two Postgres roles.** The table owner (`neondb_owner`, used by
  `DATABASE_URL`) runs migrations and one-off scripts (`db:migrate`,
  `db:seed`, `admin:bootstrap`) and, as owner, is exempt from Row Level
  Security. The running app instead connects as a second, restricted role,
  `app_runtime` (used by `APP_DATABASE_URL`), which owns nothing, so RLS
  applies to it automatically. `getDb()` and `getPublicDb()` use
  `APP_DATABASE_URL` (falling back to `DATABASE_URL` when unset, which is
  fine for scripts but never for the deployed app).
- **How the database learns who is asking.** `runAsActor(actorId, fn)`
  (`src/lib/db/index.ts`) opens a transaction on the `app_runtime`
  connection and calls `select set_config('app.user_id', $1, true)` (a
  bound parameter, not string interpolation) before running `fn`. The
  setting is transaction scoped and never leaks to another request.
  Two SQL helper functions read it back: `app.current_user_id()` and
  `app.current_role()` (the latter re-derives the caller's role by looking
  up `users` by that id and requiring `active = true` — it never trusts a
  second, separately passed role value). Public/anonymous reads
  (`getPublicDb()`) never call `set_config`, so both functions return NULL
  for them, matching only the public-read policies.
- **What is covered.** RLS (`ENABLE ROW LEVEL SECURITY`) is on the six
  business tables: `users`, `content`, `site_settings`, `enquiries`,
  `media`, `audit_log`. Roughly: anonymous can read only published
  content/media and insert enquiries (never read them); any active staff
  member can read everything; `editor`/`administrator` can write
  content/media; only `administrator` can write settings, read/update/
  delete enquiries, or manage other users; `audit_log` is insert-only for
  active staff and read-only for `administrator` — nobody, including
  administrators, can update or delete an audit entry. The exact policies
  are in `drizzle/0001_rls.sql` (plus two follow-up fix migrations).
- **What is deliberately not covered.** Better Auth's own `sessions`,
  `accounts`, and `verifications` tables have no RLS: they are only ever
  touched by the Better Auth library itself through one trusted code path,
  so table level RLS would add no real protection there and risks breaking
  sign-in. Two narrow, explained exceptions also use the owner connection
  directly rather than `runAsActor`: `writeAudit()` (called from many deep
  call sites as a best-effort side effect that must never fail the action
  it is recording), and the public enquiry submission path
  (`createEnquiry`/`findByIdempotencyKey` in `src/lib/enquiry/service.ts`),
  which needs to INSERT, then UPDATE that same row's notification status,
  and on a retry SELECT it back by the caller's own idempotency key — a
  shape RLS cannot express as "visible only if you already know the exact
  key," so it stays on the owner connection as a narrow, non-enumerable,
  audited exception. Public visibility into `enquiries` is otherwise
  exactly `INSERT`, nothing else.
- **Setting up `app_runtime`'s password.** The role is created with no
  usable password by the migration (`CREATE ROLE app_runtime LOGIN
  PASSWORD NULL`); set the real password directly against each
  environment's database (never commit it) with:
  `ALTER ROLE app_runtime PASSWORD '...';`, then build `APP_DATABASE_URL`
  with those credentials.
