-- WIP #257 row 1.8: opt-in "notify me when iPhone is available" list.
-- NOT YET APPLIED. Gated step: Holly (privacy) review + Robert sign-off, then `supabase db push`.
-- Written and read only by the `notify-list` edge function (service role). Needs 0024
-- (rate_limit_hit) first. Privacy policy must mention this list (WIP #257 row 3.5).

create table public.notify_signups (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) between 6 and 254 and email = lower(email)),
  platform text not null default 'iphone' check (platform in ('iphone')),
  token uuid not null unique default gen_random_uuid(),     -- confirm / unsubscribe link secret
  consent_text text not null check (char_length(consent_text) <= 500),   -- wording shown at sign-up
  ip_hash text check (char_length(ip_hash) <= 64),           -- salted hash, never the raw IP
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,                                  -- double opt-in
  unsubscribed_at timestamptz
);
create unique index notify_signups_email_platform_idx on public.notify_signups (email, platform);

alter table public.notify_signups enable row level security;
revoke all on public.notify_signups from anon, authenticated, public;
-- No anon/authenticated insert or read: public sign-up is only via the edge function.
create policy notify_signups_admin_read on public.notify_signups
  for select to authenticated using (public.is_admin());
grant select on public.notify_signups to authenticated;      -- policy above limits it to admins

-- Housekeeping (Arch-Std 47): unconfirmed sign-ups older than 30 days are deleted.
-- Service-role only; schedule from the daily `lifecycle` job (follow-up, not wired here).
create function public.purge_unconfirmed_notify()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.notify_signups
    where confirmed_at is null and created_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.purge_unconfirmed_notify() from public, anon, authenticated;
grant execute on function public.purge_unconfirmed_notify() to service_role;
