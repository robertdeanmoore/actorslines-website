# Beta programme applications (`/beta`, `/admin/beta`)

**Purpose:** replaces the "Tell me when it's ready" mailto with an application form for the Actors Lines beta programme (Android, Google Play Closed Testing, cap 50). WIP #269 phase P1. An applicant is a pending record, never an auth user; the account is created on approval (phase P2, through the `invite` function).

**Status:** P1 on a branch, migration `0036_beta_applications.sql` written and NOT applied (gated: Holly review, Robert sign-off). Accept and reject, the licence grant and the decision emails are phase P2. Approving real applicants waits for the Play Closed Testing release (WIP #265).

**Go-live note:** CTA switch to /beta happens at go-live (P6), after migration 0036 applied, beta-apply deployed, and #265 D14. Until then `/beta` is reachable by direct URL only: no nav, CTA, sitemap entry or email links to it, and `public/robots.txt` disallows `/beta$`; the landing and features pages keep the existing mailto (`NOTIFY_MAILTO`).

**Key files**
- `src/pages/BetaPage.tsx`: public form and confirmation. Inline validation mirrors the server. Honeypot field `website`. Turnstile required. Never shows places left. Not linked from anywhere public until go-live.
- `supabase/functions/beta-apply/index.ts`: public submit function (signed-out callers). Order: honeypot, validation, Turnstile, rate limits (3/hour and 10/day per IP bucket, 5/day per email bucket, 200/day global; salted hashes with `IP_HASH_SALT`), duplicate check, insert, then two emails (applicant auto-reply, notification to `REQUEST_NOTIFY_EMAIL`). An email failure never loses the application.
- `supabase/functions/beta-apply/policy.ts`: pure validation, constants (`BETA_CAP` 50, `REAPPLY_AFTER_DAYS` 90, `REPLY_TO` `hello@actorslines.app`, `CONSENT_VERSION`) and email text. Tests: `policy.test.ts`.
- `supabase/migrations/0036_beta_applications.sql`: `beta_applications` table. RLS: admin read and admin update of `notes` and `group_added` only; no anon or client insert. One live (pending or approved) application per address (partial unique index).
- `src/pages/admin/AdminBetaListPage.tsx`, `AdminBetaDetailPage.tsx`: admin list (default Pending, status filter, text search, places used and left) and read-only detail with the Google Group checklist and internal notes. Behind `RequireAdmin`.
- `src/lib/beta.ts`: shared constants and types. `BETA_CAP` and the consent wording must match `policy.ts`.

**Rules**
- BETA-1: a second submit for an address with a pending or approved application stores nothing, sends no email and shows "we already have your application".
- BETA-2: after a rejection the same address may apply again after 90 days; the new row is flagged `reapplied` and linked to the earlier one.
- BETA-3: an address that already has an account is stored with `existing_user = true` (admin badge). The applicant is not told.
- BETA-4: wording says "beta programme", never "trial". Replies go to `hello@actorslines.app`.
- BETA-5: no raw IP is stored; the Google account email is warned about in admin when it is not a gmail.com or googlemail.com address, never blocked.
