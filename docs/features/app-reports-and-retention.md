# In-app reports, attachments and retention (server side)

**Purpose:** a signed-in tester sends a Support or Enhancement report from the Android app, optionally with one screenshot and one audio file. The admin sees them on the request page. Rejected beta applications and old attachments are purged on a schedule. WIP #269 phases P4 (server and admin viewer) and P5.2.

**Status:** Batch 1 on a branch. Migrations `0040`, `0041`, `0042` and the `submit-request-app` function are written and NOT applied or deployed (gated: Holly approval line, Robert sign-off, wrapper allowlist entry for the new function). The Android form is Batch 2.

**Key files**
- `supabase/migrations/0040_request_attachments.sql`: `enhancement_requests.source` (`web` | `app`), `app_version`, `device_model`, `android_sdk`, `attachments_complete`; title and goal length rules become source-aware (web rows keep 5-80 and 30-2000, app rows 3-120 and 10-4000); table `request_attachments`.
- `supabase/migrations/0041_request_attachments_access.sql`: RLS (admin read only), private bucket `request-attachments`, storage read policy for admins only.
- `supabase/migrations/0042_beta_retention_purge.sql`: deletion queue for storage paths, `purge_beta_data`, queue batch and acknowledge functions, application row deleted with the account.
- `supabase/functions/submit-request-app/`: `submit`, `confirm`, `upload-urls` actions; `policy.ts` is pure and tested in `policy.test.ts`.
- `supabase/functions/dispatch/`: new server-to-server action `triage-app` (AC4.8); `isServerCall` in `policy.ts` is tested in `policy.test.ts`. The `dispatch` function needs redeploying with `submit-request-app`.
- `supabase/functions/lifecycle/purge.ts`, `index.ts`: daily purge step; `?dry_run=1` returns counts only.
- `src/lib/attachments.ts`, `src/components/admin/RequestAttachments.tsx`, `src/pages/admin/AdminRequestPage.tsx`: admin viewer.

**Rules**
- APP-1: the app submits with the member's own JWT; no JWT is 401. Limits per user: 5 an hour, 20 a day (429); identical subject and description from the same user within 2 minutes returns the same request, not a second one.
- APP-2: an expired or withdrawn licence does not stop a report (decision D3); only a signed-in, existing account does.
- APP-3: at most one image (5 MB, jpeg/png/webp) and one audio file (3 MB, mp4/aac/ogg/mpeg). Files go to signed upload URLs; `confirm` checks the real size and the first bytes against the declared type and removes any file that fails (AC4.7).
- APP-4: the report is visible to the admin at once; `attachments_complete` is false until every declared file is confirmed, and the admin page shows "Attachment upload incomplete".
- APP-5: attachments are private. Only an admin reads them, through a 5-minute signed URL. Nothing from an attachment goes to AI triage (decision D8).
- RET-1: rejected beta applications are deleted 6 months after the decision. Attachments are deleted 90 days after the request closes. The database function refuses any cutoff more recent than these.
- RET-2: every attachment row delete (purge, request delete, account deletion) queues its storage path; the daily `lifecycle` run removes the files through the Storage API, so a file can outlive its row by up to one day.
- RET-3: deleting an account deletes that person's beta application row. Pending and withdrawn applications are not purged by the schedule (open point for the owner).
- APP-6: after an app report is saved, `submit-request-app` asks `dispatch` to triage it (AC4.8) with a server-to-server call: action `triage-app`, only the request id in the body, bearer token the project service-role key (compared in constant time before any user lookup). It accepts only a request with `source = 'app'` (else 404), uses the same per-request guard and the same one-report triage as the web path, and needs no captcha. It runs in the background: a triage failure is logged by code only and never loses the report; the admin can re-run triage from the request page. A web request, a member JWT or no key is refused. Not sent: anything from an attachment (D8). The web `submit-request` and `triage-report` paths are unchanged.
- APP-7: a first signed upload URL cannot overwrite an existing file; only the `upload-urls` retry (still-pending files) can, so a file cannot be swapped after `confirm` has checked it.

**Not implemented (for Robert's decision)**
- The spec's second retention half, approved beta applications kept until account deletion "or 12 months after the beta ends", is NOT implemented: no beta end date exists anywhere in the data. Today approved applications are removed only with the account (RET-3). Robert to decide whether to set an end date (and then add the 12-month purge) or keep the account-deletion rule only; the privacy text must say which.
