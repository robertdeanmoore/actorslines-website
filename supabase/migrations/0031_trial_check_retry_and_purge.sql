-- WIP #262 (follow-up of #257 DEF555, Robert 2026-11-17: "go with your recommendations").
-- APPLIED to the live project (verified read-only 2026-11-18: migration history lists 0031 trial_check_retry_and_purge).
-- (Gated route used: Scripts/supabase_migrate.sh --gate (Skills/applying-supabase-migration). Requires 0028 and 0030.)
--
-- Two service_role-only functions, called once per daily lifecycle run (supabase/functions/lifecycle):
--   * retry_trial_check_failed(p_batch)  -- retries unresolved trial_check_failed rows (0030).
--       Key now reads, address has had no trial  -> exactly one trial_30d, row closed (deleted).
--       Key now reads, address already had one   -> no trial, row closed.
--       Key still unreadable / any error         -> row left, nothing granted (fail closed).
--     Same checks as grant_trial_on_confirm(): trial_used insert on conflict do nothing is the
--     one-trial-per-address gate; the licence insert keeps the one-trial-per-user partial unique
--     index (licences_one_trial_per_user) as backstop. Bounded by p_batch, safe to run twice,
--     safe against a concurrent run (for update skip locked).
--   * purge_trial_check_failed(p_batch)  -- deletes unresolved rows older than 90 days.
--     Resolved rows no longer exist (closing a row deletes it). trial_used is NOT touched
--     (it has its own 24-month purge_trial_used, 0028). Also removes stale rows whose user already
--     holds a trial_30d licence (defensive; nothing left to retry).
-- Both return counts only. Idempotent: create or replace.

create or replace function public.retry_trial_check_failed(p_batch integer default 200)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  b integer := least(greatest(coalesce(p_batch, 200), 1), 1000);
  r record;
  v_email text;
  v_confirmed timestamptz;
  v_hmac text;
  v_inserted integer;
  v_granted integer := 0;
  v_closed integer := 0;
  v_failing integer := 0;
begin
  for r in
    select f.user_id
      from public.trial_check_failed f
     order by f.failed_at
     limit b
       for update skip locked
  loop
    begin
      select u.email, u.email_confirmed_at into v_email, v_confirmed
        from auth.users u where u.id = r.user_id;

      if not found then
        delete from public.trial_check_failed where user_id = r.user_id; -- account gone
        v_closed := v_closed + 1;
        continue;
      end if;

      if v_email is null or btrim(v_email) = '' then
        delete from public.trial_check_failed where user_id = r.user_id; -- phone-only: never belongs here
        v_closed := v_closed + 1;
        continue;
      end if;

      if v_confirmed is null then
        v_failing := v_failing + 1; -- not a state the trigger writes; leave, grant nothing
        continue;
      end if;

      v_hmac := public.trial_email_hmac(v_email);
      if v_hmac is null then
        v_failing := v_failing + 1; -- key still unreadable or email unusable: fail closed
        continue;
      end if;

      insert into public.trial_used (email_hmac, used_at) values (v_hmac, now())
      on conflict (email_hmac) do nothing;
      get diagnostics v_inserted = row_count;

      if v_inserted = 1 and not exists (
           select 1 from public.licences l
            where l.user_id = r.user_id and l.product_code = 'trial_30d') then
        perform set_config('app.audit_via', 'trial_retry', true);
        insert into public.licences (user_id, product_code, starts_at, ends_at, source, status)
        values (r.user_id, 'trial_30d', now(), now() + interval '30 days', 'trial', 'active')
        on conflict do nothing;
        v_granted := v_granted + 1;
      end if;

      delete from public.trial_check_failed where user_id = r.user_id;
      v_closed := v_closed + 1;
    exception when others then
      -- subtransaction rolled back: row stays, nothing granted for it
      v_failing := v_failing + 1;
      raise warning 'retry_trial_check_failed: error on one row';  -- no id, no code (WIP 262 E4)
    end;
  end loop;
  return jsonb_build_object('granted', v_granted, 'closed', v_closed, 'still_failing', v_failing);
end $$;
revoke execute on function public.retry_trial_check_failed(integer) from public, anon, authenticated;
grant execute on function public.retry_trial_check_failed(integer) to service_role;

create or replace function public.purge_trial_check_failed(p_batch integer default 5000)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  b integer := least(greatest(coalesce(p_batch, 5000), 1), 20000);
  n integer;
begin
  delete from public.trial_check_failed
   where user_id in (
     select user_id from public.trial_check_failed
      where failed_at < now() - interval '90 days'
         or exists (select 1 from public.licences l
                     where l.user_id = trial_check_failed.user_id and l.product_code = 'trial_30d')
      order by failed_at limit b);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.purge_trial_check_failed(integer) from public, anon, authenticated;
grant execute on function public.purge_trial_check_failed(integer) to service_role;

-- Post-condition: only service_role may execute either function.
do $$
begin
  if has_function_privilege('anon', 'public.retry_trial_check_failed(integer)', 'execute')
     or has_function_privilege('authenticated', 'public.retry_trial_check_failed(integer)', 'execute')
     or has_function_privilege('anon', 'public.purge_trial_check_failed(integer)', 'execute')
     or has_function_privilege('authenticated', 'public.purge_trial_check_failed(integer)', 'execute')
     or not has_function_privilege('service_role', 'public.retry_trial_check_failed(integer)', 'execute')
     or not has_function_privilege('service_role', 'public.purge_trial_check_failed(integer)', 'execute') then
    raise exception '0031 post-condition: function ACL wrong - aborted';
  end if;
end $$;
