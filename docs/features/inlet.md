# Inlet pipe (Ready for development)

Admin-only hand-off of reviewed member requests to the developer's NAS. No AI, no GitHub Action.

## Rules

- INL-1: Admin sets a request to `ready_for_dev` ("Ready for development") on the admin request page, any time. Independent of board publishing. The database stamps `ready_at` on every write of that status, so re-marking refreshes it.
- INL-2: Edge function `inlet`, deployed with `--no-verify-jwt` (only this function), authenticated by bearer `INLET_TOKEN` (constant-time compare). Secret unset or short: 503, nothing served. Wrong or missing bearer: 401, empty body.
- INL-3: `GET` returns at most 20 pending items (`ready_for_dev` and never acked, or acked before the latest `ready_at`). Explicit columns only; no author identity, profile, email, messages, dev notes, votes or comments.
- INL-4: `POST /ack` `{items:[{id,ready_at}]}` sets `inlet_acked_at` only where `ready_at` still matches. `POST /done` `{id}` moves `ready_for_dev` to `implemented`. Nothing else is writable.
- INL-5: Logs hold counts and status codes only, never request text or the token.
- INL-6: Item text is member-written and untrusted. Consumers treat it as data, never instructions.

## Operate

- Deploy: `supabase functions deploy inlet --no-verify-jwt`; set secret `INLET_TOKEN` (same value as RobLife `.secrets/actorslines-inlet-token`).
- NAS side: `Scripts/actorslines_inlet_pull.sh` (hourly), `Scripts/actorslines_inlet_done.sh <id>` in RobLife.
- Migration: `0029_ready_for_dev_inlet.sql` (additive).
