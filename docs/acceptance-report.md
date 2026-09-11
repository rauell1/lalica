# Acceptance report

How to read the labels:

- Automated: verified by the checked-in test suite (`npm test`, 68 tests)
  or by the dash check (`npm run check:dashes`) with no human judgement.
- Manual: verified live against the running local deployment with curl
  requests, database checks, and HTML inspection, or reserved for checks
  that genuinely need a human (a visual keyboard pass).
- Blocked: the production-only path could not be exercised in this
  environment because it needs provider accounts (Upstash, Vercel, Neon,
  Resend). The local equivalent path was verified instead.

Environment: local Next.js dev server on port 3000, local PostgreSQL
16.2, demo mode on, in-memory limiter. Date of report: 10 September 2026.

## The 22 acceptance flows

| # | Flow | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Services show the correct name and contact details | Pass, manual | /services and the three detail pages render the three PDF verified service groups with the exact item lists. Header and footer carry Lalica Engineering Limited, DSM Center, Kahawa West, Nairobi, +254 728 112 444, info@lalicaengineering.com. Provenance in docs/content-provenance.md |
| 2 | Unauthenticated access is blocked | Pass, manual + automated | /admin redirects to /admin/login (307), draft preview returns 307, draft media returns 404 for anonymous requests. Automated: role matrix and demo route tests |
| 3 | Editors are draft only | Pass, automated + manual | Automated: service layer rejects publishContent by an editor (forbidden). Manual: editor session sees no Publish button; a direct call to publishContentAction returns {ok:false}. Editors can create, edit, submit, and upload media |
| 4 | Enquiry Managers are enquiry only | Pass, manual + automated | Manual: /admin/enquiries 200, all content and admin sections redirect away (307). Automated: listEnquiries allowed for enquiry manager and forbidden for editor; content create forbidden |
| 5 | Administrators publish and unpublish | Pass, manual + automated | Manual end to end over the live server action pipeline: create draft, publish, public page 200 and listed in sitemap, unpublish, page 404. Automated: publish/unpublish/submit lifecycle tests |
| 6 | Disabled users are locked out immediately | Pass, manual | Disabling the demo editor in the database made their existing session redirect to /admin/login on the next request; reactivating restored access. Enforcement reads the active flag on every request |
| 7 | Direct requests cannot bypass roles | Pass, manual + automated | Manual: raw HTTP calls to publishContentAction and updateSettingsAction with an editor session return "Your role does not allow this action". Automated: assertPermission throws forbidden for every protected service call |
| 8 | Drafts are never visible publicly (pages, sitemap, metadata, caches) | Pass, manual + automated | Manual: draft project returned 404 on /projects/slug, absent from /projects and from /sitemap.xml. After publish it appeared; after unpublish it disappeared from all three. Automated: listPublished and getPublishedBySlug exclude drafts |
| 9 | Publishing updates pages without any manual deployment | Pass, manual | Publishing through the CMS made the page live on the same running server with no restart or redeploy, and the change showed immediately |
| 10 | Unpublishing removes all public references | Pass, manual | Page 404, index card gone, sitemap entry gone, all within the same server process |
| 11 | Concurrent submissions hit the shared limiter | Pass with one blocked part | Manual burst: 8 parallel enquiry posts from one client, exactly 5 stored (201) and 3 rejected (429) with Retry-After: 900, matching the 5 per 15 minutes enquiry limit. Automated: limiter window, fail closed, and identifier hashing tests. Blocked: the Upstash Redis distributed path needs real Upstash credentials; the limiter fails closed in production until they are configured |
| 12 | The server rejects invalid input | Pass, automated + manual | Manual: invalid email 422 with field errors; fake JPEG (wrong magic bytes) 400; SVG authorisation 400. Automated: Zod schema tests for enquiry payloads, blocks, and dash characters |
| 13 | Duplicate retries do not duplicate | Pass, automated + manual | Manual: retrying the same idempotency key returns the same ENQ reference and stores one row. Automated: createEnquiry returns created=false with the original row on retry. The 23505 cause chain fix is covered by this test |
| 14 | Notification failure does not lose the enquiry | Pass, automated | createEnquiry with a throwing email transport still stores the row and flags notification_status=failed; the admin list surfaces failed notifications with a retry |
| 15 | Unsafe rich text and unsupported uploads are rejected | Pass, automated + manual | Automated: unknown block types rejected, smuggled extra fields stripped, only the 7 typed blocks accepted, SVG/PDF uploads refused, tampered, expired, and wrong-purpose tickets rejected. Manual: SVG authorisation 400 and text renamed .jpg rejected on upload |
| 16 | Upload permissions cannot be bypassed | Pass, automated + manual | Manual: anonymous authorisation 403, enquiry manager authorisation forbidden. Automated: permission checks on authorizeUpload and signature verification of upload tickets |
| 17 | Mobile navigation, keyboard, forms, and dialogs work | Partially verified, manual | The markup is verified: mobile menu with aria-expanded, dialog component with focus trap and Escape handling, forms with labels and server side validation. A full visual and keyboard pass in a real browser on real devices remains an outstanding manual task before go-live |
| 18 | No fictional content | Pass, manual | Every published sentence maps to a physical PDF page in docs/content-provenance.md. No dates, counts, projects, testimonials, certifications, awards, CSR figures, hours, coordinates, WhatsApp, or socials are published. Unresolved items are listed in docs/content-verification.md and their sections stay unpublished |
| 19 | No U+2013 or U+2014 anywhere | Pass, automated | npm run check:dashes passes over all authored files, and every rendered public page was scanned live with zero matches. The CMS also rejects the characters at save and publish time with a correction message |
| 20 | Build and type checks pass | Pass, automated | tsc --noEmit clean under TypeScript strict; 68/68 vitest tests pass; a full production `next build` completed successfully with no warnings and all routes compiled |
| 21 | Missing production secrets fail safely | Pass, automated | Missing DATABASE_URL, BETTER_AUTH_SECRET, or PUBLIC_APP_URL throws a clear configuration error; without Upstash the limiter fails closed for submissions and mutations; the demo sign-in route returns 404 under NODE_ENV=production |
| 22 | The full report distinguishes automated, manual, and blocked results | Pass | This document |

## Summary

- Automated: 68 tests passing, plus the dash check, plus the type check.
- Manual: all live smoke flows above were executed and passed against the
  running local deployment.
- Blocked by external credentials: only the Upstash Redis distributed
  limiter path (flow 11, production leg). Every provider dependent
  production integration (Vercel deploy, Neon production database, Blob
  storage, Resend sending, Turnstile) is implemented against the real SDKs
  and verified locally or by simulation, and each fails safely when its
  credentials are absent.

## Outstanding manual work before go-live

1. Real browser pass on phones and desktop for navigation, keyboard, and
   dialogs (flow 17).
2. First real deployment following docs/deployment.md.
3. Google sign-in end to end and the one-time administrator bootstrap on
   the production environment.
4. Confirmations from the company listed in docs/content-verification.md.
