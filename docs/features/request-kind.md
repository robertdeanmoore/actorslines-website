# Request type: Support or Enhancement

**Purpose:** a member request is labelled Support (something is wrong) or Enhancement (something to improve). One table, one admin queue, one status flow, one AI triage. WIP #269 phase P3.

**Status:** P3 on a branch; migration `0037_enhancement_request_kind.sql` written and NOT applied (gated). The app-facing submit route and attachments are phase P4.

**Key files**
- `supabase/migrations/0037_enhancement_request_kind.sql`: `enhancement_requests.kind` (`enhancement` | `support`, default `enhancement`, indexed). Existing rows read as Enhancement.
- `supabase/functions/dispatch/policy.ts`: `parseKind` (absent or null means enhancement so an old client keeps working; any other value is refused with 400) and `kindLabel`. Tests in `policy.test.ts`.
- `supabase/functions/dispatch/index.ts`: `submit-request` validates and stores `kind`; the notify email subject carries `[Support]` or `[Enhancement]`.
- `supabase/functions/dispatch/triage.ts`: the triage request carries `kind`; the prompt asks for a defect-style read of a Support item.
- `src/pages/requests/NewRequestPage.tsx`: type selector; Support relabels the fields and keeps "how often" optional.
- `src/pages/admin/AdminQueuePage.tsx`, `AdminRequestPage.tsx`: kind badge and a type filter (All, Support, Enhancement).

**Rules**
- KIND-1: `kind` is one of `enhancement`, `support`; a missing value is `enhancement`.
- KIND-2: Support items follow the same publish step as enhancements; nothing reaches the public board unless Robert publishes it.
