-- WIP #257 row 1.3: close the direct client insert on enhancement_requests, and validate the
-- length constraints added NOT VALID in 0024.
-- NOT YET APPLIED. Committed for review only: NEVER run by hand. Gated step (Holly + Robert
-- sign-off, `supabase db push`), and only AFTER:
--   1. 0024/0025 and the `dispatch` + `notify-list` functions are live (see SETUP.md), and
--   2. this site PR is merged and deployed, so the form calls `submit-request` instead of
--      inserting directly (otherwise dropping the policy breaks "new request" on the live site), and
--   3. Slog's read-only check returns 0 (a failing VALIDATE would abort the push):
--        select count(*) from public.enhancement_requests
--         where char_length(goal) > 2000 or char_length(where_in_app) > 300
--            or char_length(how_it_works) > 2000 or char_length(usage_frequency) > 100
--            or char_length(extra_notes) > 2000;

-- Saving a request now goes through the `dispatch` function (Turnstile + rate limit +
-- service-role insert + email to Robert). Remove the direct client insert so the bot
-- check cannot be bypassed by calling the REST API with a user JWT.
drop policy if exists "requests_insert" on public.enhancement_requests;

alter table public.enhancement_requests validate constraint enhancement_requests_goal_max;
alter table public.enhancement_requests validate constraint enhancement_requests_where_max;
alter table public.enhancement_requests validate constraint enhancement_requests_how_max;
alter table public.enhancement_requests validate constraint enhancement_requests_freq_max;
alter table public.enhancement_requests validate constraint enhancement_requests_notes_max;
