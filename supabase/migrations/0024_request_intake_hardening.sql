-- WIP #257 row 1.3: tighten enhancement-request intake.
-- NOT YET APPLIED. Gated step: Holly review + Robert sign-off, then `supabase db push`
-- (Skills/applying-supabase-migration). Deploy the new `dispatch` function (action
-- "submit-request") BEFORE or WITH this migration: section 3 removes the direct client insert.

-- 1. Max lengths on member-supplied text. NOT VALID: new and updated rows are checked now,
--    existing rows are not re-scanned (none are expected to exceed these, but a failing
--    VALIDATE would otherwise block the push). Run the VALIDATE statements below by hand
--    once `select ... where char_length(col) > limit` returns nothing.
alter table public.enhancement_requests
  add constraint enhancement_requests_goal_max check (char_length(goal) <= 2000) not valid,
  add constraint enhancement_requests_where_max check (char_length(where_in_app) <= 300) not valid,
  add constraint enhancement_requests_how_max check (char_length(how_it_works) <= 2000) not valid,
  add constraint enhancement_requests_freq_max check (char_length(usage_frequency) <= 100) not valid,
  add constraint enhancement_requests_notes_max check (char_length(extra_notes) <= 2000) not valid;
-- title already has `between 5 and 80` (0001).
--   alter table public.enhancement_requests validate constraint enhancement_requests_goal_max;
--   (repeat for _where_max, _how_max, _freq_max, _notes_max)

-- 2. Generic sliding-window rate limiter, service-role only (edge functions).
--    Returns true when the hit is allowed (and records it), false when over the limit.
create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null check (char_length(bucket) <= 200),
  created_at timestamptz not null default now()
);
create index rate_limit_events_bucket_time_idx on public.rate_limit_events (bucket, created_at desc);
alter table public.rate_limit_events enable row level security;   -- no policies: service role only
revoke all on public.rate_limit_events from anon, authenticated, public;

create function public.rate_limit_hit(p_bucket text, p_max integer, p_window interval)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  -- Serialise concurrent hits on the same bucket so the count-then-insert cannot race.
  perform pg_advisory_xact_lock(hashtext(p_bucket));
  -- Opportunistic housekeeping: nothing in this table is needed beyond 2 days.
  delete from public.rate_limit_events where created_at < now() - interval '2 days';
  select count(*) into n from public.rate_limit_events
    where bucket = p_bucket and created_at > now() - p_window;
  if n >= p_max then return false; end if;
  insert into public.rate_limit_events (bucket) values (p_bucket);
  return true;
end;
$$;
revoke execute on function public.rate_limit_hit(text, integer, interval) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, interval) to service_role;

-- 3. Saving a request now goes through the `dispatch` function (Turnstile + rate limit +
--    service-role insert + email to Robert). Remove the direct client insert so the bot
--    check cannot be bypassed by calling the REST API with a user JWT.
drop policy if exists "requests_insert" on public.enhancement_requests;
