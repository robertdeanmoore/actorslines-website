-- WIP #269 P1 slice 1.1: beta programme applications (pending applicants; NOT auth users).
-- NOT YET APPLIED. Gated step: Holly review (PII table + RLS) + Robert sign-off, then the
-- gated migration runner (Skills/applying-supabase-migration). Needs 0024 (rate_limit_hit).
--
-- Written by the `beta-apply` edge function (service role). Read by admins only (RLS below).
-- An applicant has no account: the account is created on approval (P2, via the `invite` fn).
-- No raw IP is stored (rate limiting uses salted-hash buckets in public.rate_limit_events).
-- Retention (WIP #269 D4, approved): rejected rows' personal fields deleted 6 months after the
-- decision; approved rows kept until account deletion or 12 months after the beta ends. The
-- purge step ships with P5 (lifecycle fn), not here.

create table if not exists public.beta_applications (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  reason text not null check (char_length(reason) between 20 and 1000),
  email text not null check (char_length(email) between 6 and 254 and email = lower(email)),
  google_email text not null check (char_length(google_email) between 6 and 254 and google_email = lower(google_email)),
  town text not null check (char_length(town) between 1 and 120),
  actor_type text not null check (actor_type in ('professional', 'amateur')),
  in_company boolean not null,
  company_name text check (company_name is null or char_length(company_name) between 1 and 120),
  check ((in_company and company_name is not null) or (not in_company and company_name is null)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  reject_reason_internal text check (reject_reason_internal is null or char_length(reject_reason_internal) <= 1000),
  invite_sent_at timestamptz,
  group_added boolean not null default false,
  user_id uuid references auth.users (id) on delete set null,   -- set when the invite is accepted (P2)
  existing_user boolean not null default false,                 -- email already matched a registered account
  reapplied boolean not null default false,
  prior_application_id bigint references public.beta_applications (id) on delete set null,
  consent_at timestamptz not null default now(),
  consent_version text not null check (char_length(consent_version) <= 40),
  notes text check (notes is null or char_length(notes) <= 2000)
);

-- One live (pending or approved) application per address. Backs the duplicate rule and closes the
-- race between two simultaneous submits. A rejected or withdrawn row does not block re-applying.
create unique index if not exists beta_applications_live_email_idx
  on public.beta_applications (email) where status in ('pending', 'approved');
create index if not exists beta_applications_status_created_idx on public.beta_applications (status, created_at desc);
create index if not exists beta_applications_email_idx on public.beta_applications (email);

alter table public.beta_applications enable row level security;
revoke all on public.beta_applications from public, anon, authenticated;
-- No anon or authenticated insert: public submission is only via the edge function (service role).
drop policy if exists beta_applications_admin_read on public.beta_applications;
create policy beta_applications_admin_read on public.beta_applications
  for select to authenticated using (public.is_admin());
drop policy if exists beta_applications_admin_update on public.beta_applications;
create policy beta_applications_admin_update on public.beta_applications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.beta_applications to authenticated;     -- policy above limits it to admins
-- Admin can edit only the two working fields from the browser. Status, decision and licence
-- fields change only through the P2 `beta-decide` function (service role).
grant update (notes, group_added) on public.beta_applications to authenticated;
