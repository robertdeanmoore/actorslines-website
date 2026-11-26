-- WIP #269 P2 slice 2.1: decision and licence-grant columns on beta_applications.
-- NOT YET APPLIED. Gated step: Holly review + Robert sign-off, then the gated migration runner.
--
-- Added to public.beta_applications (created in 0036). All columns nullable: every existing row
-- is an undecided application, so nothing is backfilled here. Idempotent: safe to re-run.

alter table public.beta_applications
  add column if not exists grant_product text
    check (grant_product is null or grant_product in ('unlimited_6mo'));

alter table public.beta_applications
  add column if not exists grant_months integer
    check (grant_months is null or grant_months between 1 and 12);

alter table public.beta_applications
  add column if not exists grant_applied_at timestamptz;

alter table public.beta_applications
  add column if not exists licence_id bigint references public.licences (id) on delete set null;

alter table public.beta_applications
  add column if not exists group_email_sent_at timestamptz;

alter table public.beta_applications
  add column if not exists decision_email_sent_at timestamptz;

alter table public.beta_applications
  add column if not exists invite_expires_at timestamptz;

-- Grant is all-or-nothing: a product without a term, or a term without a product, is invalid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'beta_applications_grant_pair_chk'
      and conrelid = 'public.beta_applications'::regclass
  ) then
    alter table public.beta_applications
      add constraint beta_applications_grant_pair_chk
      check ((grant_product is null and grant_months is null)
          or (grant_product is not null and grant_months is not null));
  end if;
end $$;

create index if not exists beta_applications_user_idx
  on public.beta_applications (user_id) where user_id is not null;
