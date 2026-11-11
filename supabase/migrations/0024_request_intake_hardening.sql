-- WIP #257 row 1.3: tighten enhancement-request intake.
-- NOT YET APPLIED. Gated step: Holly review + Robert sign-off, then `supabase db push`
-- (Skills/applying-supabase-migration). Purely additive: it does NOT remove the existing
-- client insert policy ("requests_insert"), so the live site keeps working. The policy is
-- dropped later by 0026 (site PR), after the new `dispatch` action and the site are live.

-- 1. Max lengths on member-supplied text. NOT VALID: new and updated rows are checked now,
--    existing rows are not re-scanned (none are expected to exceed these, but a failing
--    VALIDATE would otherwise block the push). VALIDATE lives in 0026; Slog's read-only
--    check query (rows over any limit) must return 0 before 0026 is pushed.
alter table public.enhancement_requests
  add constraint enhancement_requests_goal_max check (char_length(goal) <= 2000) not valid,
  add constraint enhancement_requests_where_max check (char_length(where_in_app) <= 300) not valid,
  add constraint enhancement_requests_how_max check (char_length(how_it_works) <= 2000) not valid,
  add constraint enhancement_requests_freq_max check (char_length(usage_frequency) <= 100) not valid,
  add constraint enhancement_requests_notes_max check (char_length(extra_notes) <= 2000) not valid;
-- title already has `between 5 and 80` (0001).

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
returns boolean language plpgsql security definer set search_path = '' as $$
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
