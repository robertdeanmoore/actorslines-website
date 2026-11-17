-- WIP #257 DEF555 hardening (Robert 2026-11-17: "no trial" when the trial key cannot be read).
-- NOT YET APPLIED. Gated step: Holly review + Robert data-risk sign-off, then
-- Scripts/supabase_migrate.sh --gate WIP#257 (Skills/applying-supabase-migration).
--
-- 0028 works (RobLife Deliverables "Actors Lines - Trial Record Counts Result 2026-11-17"). This
-- only closes the one silent path left in grant_trial_on_confirm(): a null hash (key unreadable)
-- was lumped with "no usable email" and granted a trial unchecked. Now:
--   * no usable email (phone-only user)      -> trial granted, as 0028 intended (unchanged)
--   * usable email, key unreadable / any
--     error while hashing                    -> NO trial, account kept, a row in trial_check_failed
--   * never an exception out of the trigger  -> signup and invite confirmation are never blocked
-- No rekey, no rebuild of trial_used, Vault kept. Idempotent: safe to run twice.
-- Follow-up, NOT built here: lifecycle retry of trial_check_failed rows plus an alert when the
-- count is > 0 (Holly, A09), and a 90-day purge of unresolved rows.

-- ── 1. flag table: pseudonymous id and time only, no email ───────────────────────────────
create table if not exists public.trial_check_failed (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_at timestamptz not null default now(),
  reason text not null default 'key_unavailable'
);
comment on table public.trial_check_failed is
  'DEF555/0030: member confirmed but the trial key could not be used; NO trial was granted. '
  'Holds no email. Definer functions and service_role only.';
alter table public.trial_check_failed enable row level security;  -- no policies
revoke all on public.trial_check_failed from public, anon, authenticated;
grant select, insert, delete on public.trial_check_failed to service_role;

-- ── 2. grant_trial_on_confirm: fail closed, never raise ──────────────────────────────────
create or replace function public.grant_trial_on_confirm()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hmac text;
  v_inserted integer := 0;
  v_usable boolean;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new; -- already handled
  end if;

  v_usable := public.normalise_trial_email(new.email) is not null;

  if v_usable then
    -- Any error while hashing (Vault privilege, missing key) is caught: fail closed, never abort signup.
    begin
      v_hmac := public.trial_email_hmac(new.email);
    exception when others then
      v_hmac := null;
    end;

    if v_hmac is null then
      raise warning 'trial_check_failed: trial key unavailable for user %; NO trial granted', new.id;
      begin
        insert into public.trial_check_failed (user_id, failed_at, reason)
        values (new.id, now(), 'key_unavailable')
        on conflict (user_id) do nothing;
      exception when others then
        raise warning 'trial_check_failed: could not record failure for user %', new.id;
      end;
      return new; -- account kept, no trial
    end if;

    insert into public.trial_used (email_hmac, used_at) values (v_hmac, now())
    on conflict (email_hmac) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
      return new; -- this address has had its trial: user is created, no trial
    end if;
  else
    raise warning 'trial_used: no usable email for user %; trial granted unchecked', new.id;
  end if;

  perform set_config('app.audit_via', 'trial_trigger', true);
  insert into public.licences (user_id, product_code, starts_at, ends_at, source, status)
  values (new.id, 'trial_30d', now(), now() + interval '30 days', 'trial', 'active')
  on conflict do nothing; -- the one-trial-per-user partial unique index makes this idempotent
  return new;
end $$;

-- ── 3. post-condition: the key must hash, deterministically and with normalisation ────────
-- Stronger than the 0028 row-count check: aborts this migration (not signups) if the hasher is
-- unusable. Probe addresses are fixed literals, nothing is stored.
do $$
declare
  a text := public.trial_email_hmac('Probe.Check+x@Gmail.com');
  b text := public.trial_email_hmac('probecheck@googlemail.com');
  c text := public.trial_email_hmac('probecheck@gmail.com');
  d text := public.trial_email_hmac('other.person@example.com');
begin
  if a is null or d is null then
    raise exception '0030 post-condition: trial_email_hmac returned null (key unreadable) - aborted';
  end if;
  if a is distinct from b or a is distinct from c then
    raise exception '0030 post-condition: hash not stable across equivalent addresses - aborted';
  end if;
  if a = d or length(a) <> 64 then
    raise exception '0030 post-condition: hash does not separate different addresses - aborted';
  end if;
  if (select count(*) from vault.decrypted_secrets
       where name = 'trial_email_pepper' and decrypted_secret is not null) <> 1 then
    raise exception '0030 post-condition: expected exactly one readable trial_email_pepper - aborted';
  end if;
end $$;
