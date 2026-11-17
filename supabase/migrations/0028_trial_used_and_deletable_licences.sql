-- WIP #257 DEF555 (Holly ruling 2026-11-17, option (b), retention 24 months; Robert/Kate decision).
-- NOT YET APPLIED. Gated step: Holly review + Robert data-risk sign-off, then
-- Scripts/supabase_migrate.sh --gate WIP#257 (Skills/applying-supabase-migration).
-- Numbering: 0027 is PR 60 (usage data purge); the inlet migration will be 0029.
--
-- Two defects, one migration:
--   1. Account deletion FAILS for anyone holding a licence: licences.user_id cascades a DELETE,
--      and trg_licences_audit_delete (0018) refuses every delete. Fix: user_id becomes nullable,
--      on delete set null. The cascade is now an UPDATE; the "never delete a licence" trigger is
--      kept as is. The orphaned row holds no email and no name (product, dates, status only).
--   2. One free trial per person was only a partial unique index on user_id, which dies with the
--      user, so delete-and-re-register got a fresh trial. Fix: trial_used keeps a KEYED HASH of
--      the normalised email plus the trial start date, 24 months, and nothing else.
--
-- The HMAC key ("pepper") is generated inside this migration into Supabase Vault under the
-- name trial_email_pepper. It is never in the repo. Only security-definer functions read it.
-- The hash is pseudonymised, NOT anonymous: say so in Privacy (Holly's wording, DEF555 ruling).
-- Rotating the pepper un-blocks every earlier hash: NEVER rotate the pepper (runbook rule).
--
-- Slog apply/verify checklist (after apply, from outside):
--   [ ] Account deletion succeeds (delete_own_account) for a member holding a trial licence, and
--       for a member holding a purchased/granted licence; the licence row survives with
--       user_id null and a licence_audit row 'updated' via 'account_deleted' exists.
--   [ ] Re-inviting the SAME address after deletion (also a +tag and, for gmail, a dotted
--       variant) creates the user with NO trial licence; a different address gets a trial.
--   [ ] anon and authenticated cannot select from public.trial_used, and cannot execute
--       purge_trial_used / trial_email_hmac / normalise_trial_email (no table or function grants).
--   [ ] select count(*) from public.trial_used > 0 and <= number of trial_30d licences (dedupe
--       by normalised address lowers it), and vault.decrypted_secrets has exactly one trial_email_pepper row.
--   [ ] Lifecycle inactivity deletion: errors from deleteUser are counted as errors, not deleted.
--   [ ] Admin notes: never put an email address in licence_audit.details.note (orphans keep it).

-- ── 1. licences.user_id: nullable, set null on user delete ────────────────────────────────
alter table public.licences alter column user_id drop not null;
alter table public.licences drop constraint if exists licences_user_id_fkey;
alter table public.licences
  add constraint licences_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
-- No check constraint or index on licences rejects a null user_id (the unique trial index and
-- licences_user_idx allow multiple nulls). The RLS policy licences_own_or_admin
-- (user_id = auth.uid() or is_admin()) simply hides orphans from members.

-- ── 2. audit trigger: tolerate the set-null cascade ───────────────────────────────────────
-- Same function as 0018 with ONE change: when user_id goes from set to null (account deletion),
-- the actor is forced to null. Otherwise actor would be auth.uid() = the user being deleted,
-- whose profiles row the same cascade may already have removed, and the licence_audit.actor
-- foreign key (profiles) would fail the whole deletion. DELETE stays refused.
create or replace function public.audit_licence_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
  v_via text;
  v_note text;
  v_action text;
  v_orphaned boolean := false;
begin
  if tg_op = 'DELETE' then
    raise exception 'licences rows are never deleted -- revoke instead (golden principle #1, rules.md)';
  end if;

  if tg_op = 'UPDATE' and old.user_id is not null and new.user_id is null then
    v_orphaned := true;
  end if;

  if v_orphaned then
    v_actor := null;
    v_via := 'account_deleted';
  else
    v_actor := coalesce(nullif(current_setting('app.audit_actor', true), '')::uuid, auth.uid());
    v_via := nullif(current_setting('app.audit_via', true), '');
  end if;
  v_note := case when v_orphaned then null else nullif(current_setting('app.audit_note', true), '') end;

  if tg_op = 'INSERT' then
    v_action := 'granted';
  elsif new.status = 'revoked' and old.status is distinct from 'revoked' then
    v_action := 'revoked';
  else
    v_action := 'updated';
  end if;

  insert into public.licence_audit (licence_id, actor, action, via, details)
  values (
    new.id, v_actor, v_action, v_via,
    jsonb_strip_nulls(jsonb_build_object(
      'note', v_note, 'product_code', new.product_code, 'status', new.status
    ))
  );
  return new;
end $$;

-- ── 3. the pepper, generated inside the migration into Vault ─────────────────────────────
-- Requires the Supabase Vault extension (enabled by default on hosted Supabase). If it is not
-- available this migration stops here, before changing anything else that matters; smallest
-- alternative then: a one-row private table (RLS on, no policies, no grants) filled with
-- encode(gen_random_bytes(32),'hex'), read only by trial_email_hmac().
create extension if not exists supabase_vault;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'trial_email_pepper') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'trial_email_pepper',
                                'HMAC key for trial_used email hashes (DEF555). Do not rotate.');
  end if;
end $$;

-- ── 4. trial_used ────────────────────────────────────────────────────────────────────────
create table if not exists public.trial_used (
  email_hmac text primary key,
  used_at timestamptz not null default now()
);
comment on table public.trial_used is
  'DEF555: keyed hash of the normalised email + trial start date, kept 24 months to stop '
  'delete-and-re-register trial abuse. Pseudonymised personal data. Definer functions only.';
create index if not exists trial_used_used_at_idx on public.trial_used (used_at);

alter table public.trial_used enable row level security;  -- no policies: nothing but definer/service_role
revoke all on public.trial_used from public, anon, authenticated;
grant select, insert, delete on public.trial_used to service_role;

-- ── 5. normaliser and hasher (internal; service role only) ───────────────────────────────
-- lowercase + trim; strip "+tag" from the local part; gmail.com/googlemail.com: remove dots and
-- treat googlemail as gmail. Anything without exactly one usable "@" returns null.
create or replace function public.normalise_trial_email(p_email text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v text := lower(btrim(coalesce(p_email, '')));
  v_local text;
  v_domain text;
begin
  if v = '' or position('@' in v) < 2 or length(v) - length(replace(v, '@', '')) <> 1 then
    return null;
  end if;
  v_local := split_part(v, '@', 1);
  v_domain := split_part(v, '@', 2);
  if v_domain = '' then
    return null;
  end if;
  v_local := split_part(v_local, '+', 1);
  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  end if;
  if v_local = '' then
    return null;
  end if;
  return v_local || '@' || v_domain;
end $$;

-- Returns the hex HMAC-SHA256, or null when the email is unusable or the pepper is missing.
create or replace function public.trial_email_hmac(p_email text)
returns text language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_norm text := public.normalise_trial_email(p_email);
  v_key text;
begin
  if v_norm is null then
    return null;
  end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'trial_email_pepper' limit 1;
  if v_key is null then
    return null;
  end if;
  return encode(extensions.hmac(convert_to(v_norm, 'UTF8'), convert_to(v_key, 'UTF8'), 'sha256'), 'hex');
end $$;

revoke execute on function public.normalise_trial_email(text) from public, anon, authenticated;
grant execute on function public.normalise_trial_email(text) to service_role;
revoke execute on function public.trial_email_hmac(text) from public, anon, authenticated;
grant execute on function public.trial_email_hmac(text) to service_role;

-- ── 6. grant_trial_on_confirm: one trial per normalised address ──────────────────────────
-- Same shape as 0018. New: record the hash first; grant the trial only if this address has not
-- had one. No usable email (phone-only user) or pepper missing at runtime: grant as before and
-- warn; invites are never blocked. An admin can still grant a trial by hand.
create or replace function public.grant_trial_on_confirm()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hmac text;
  v_inserted integer := 0;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new; -- already handled
  end if;

  v_hmac := public.trial_email_hmac(new.email);
  if v_hmac is null then
    raise warning 'trial_used: no hash for user % (no usable email or pepper missing); trial granted unchecked', new.id;
  else
    insert into public.trial_used (email_hmac, used_at) values (v_hmac, now())
    on conflict (email_hmac) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
      return new; -- this address has had its trial: user is created, no trial
    end if;
  end if;

  perform set_config('app.audit_via', 'trial_trigger', true);
  insert into public.licences (user_id, product_code, starts_at, ends_at, source, status)
  values (new.id, 'trial_30d', now(), now() + interval '30 days', 'trial', 'active')
  on conflict do nothing; -- the one-trial-per-user partial unique index makes this idempotent
  return new;
end $$;

-- ── 7. backfill: every existing trial holder is covered, set-based and idempotent ────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'trial_email_pepper') then
    raise exception 'trial_email_pepper missing from Vault: backfill aborted';
  end if;
end $$;

insert into public.trial_used (email_hmac, used_at)
select h.hmac, min(l.starts_at)
  from public.licences l
  join auth.users u on u.id = l.user_id
 cross join lateral (select public.trial_email_hmac(u.email) as hmac) h
 where l.product_code = 'trial_30d' and h.hmac is not null
 group by h.hmac
on conflict (email_hmac) do nothing;

-- Fail loudly if the backfill silently inserted nothing (e.g. pepper present but undecryptable).
do $$
begin
  if exists (
       select 1 from public.licences l join auth.users u on u.id = l.user_id
        where l.product_code = 'trial_30d' and public.normalise_trial_email(u.email) is not null)
     and (select count(*) from public.trial_used) = 0 then
    raise exception 'trial_used backfill inserted no rows although trial licences with usable emails exist: pepper unreadable? aborted';
  end if;
end $$;

-- ── 8. retention: 24 months from trial start ─────────────────────────────────────────────
-- Separate from purge_usage_data (PR 60) so this PR does not depend on it. Batched like it.
-- Patch note (add AFTER PR 60 merges): in supabase/functions/lifecycle/purge.ts, call
--   admin.rpc("purge_trial_used", { p_batch })
-- once per lifecycle run, inside the same loop/pass cap; count only, never content.
create or replace function public.purge_trial_used(p_batch integer default 5000)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  b integer := least(greatest(coalesce(p_batch, 5000), 1), 20000);
  n integer;
begin
  delete from public.trial_used
   where email_hmac in (
     select email_hmac from public.trial_used
      where used_at < now() - interval '24 months'
      order by used_at limit b);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.purge_trial_used(integer) from public, anon, authenticated;
grant execute on function public.purge_trial_used(integer) to service_role;
