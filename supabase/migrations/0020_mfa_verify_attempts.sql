-- Per-user attempt counter backing the mfa-verify edge function's throttle
-- (RobLife WIP #103 Row 4, Holly's §5.1 finding: TOTP verification had no
-- app-level throttle anywhere, and supabase.auth.mfa.verify()'s own client
-- API takes no captchaToken -- there was no mechanism available to gate it
-- even if Turnstile were configured for this step). Same shape as
-- trusted_devices (0015/0016): reads/writes go only through the edge
-- function's service-role client, never queried directly from the browser,
-- so no anon/authenticated policy is needed for normal use.

create table public.mfa_verify_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index mfa_verify_attempts_user_id_idx on public.mfa_verify_attempts(user_id);
create index mfa_verify_attempts_attempted_at_idx on public.mfa_verify_attempts(attempted_at);

alter table public.mfa_verify_attempts enable row level security;

create policy "mfa_verify_attempts_admin" on public.mfa_verify_attempts
  for all using (public.is_admin());
