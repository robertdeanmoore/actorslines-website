-- RobLife WIP #160 H28-c (Holly, 2026-10-06; OWASP A01:2025 Broken Access Control).
-- Supabase gives anon and authenticated EXECUTE on every new public function by default, and
-- PUBLIC holds EXECUTE too; earlier migrations took away PUBLIC only, so anon kept its own copy.
-- Four definer-rights functions were callable by anyone holding the anon key:
--   find_user_by_email      email -> user id lookup (account enumeration)
--   redeem_code_tx          redeem any code for any p_user, skipping the redeem-code edge function
--   entitlements_for        any user's tier and licence end
--   effective_entitlements  any user's capabilities
-- Callers checked before this change (website src/, supabase/functions/, Android app, ActorsVoice
-- workflows): ShareScriptDialog.tsx -> find_user_by_email (signed in); AdminUserLicencesPage.tsx ->
-- entitlements_for (admin, another user's id); entitlement-token and redeem-code edge functions
-- use the service role. No caller of effective_entitlements outside entitlements_for.

-- ── find_user_by_email: signed-in users only ──────────────────────────────────
revoke execute on function public.find_user_by_email(text) from public, anon;
grant execute on function public.find_user_by_email(text) to authenticated;

-- ── redeem_code_tx: service role only (the redeem-code edge function) ─────────
revoke execute on function public.redeem_code_tx(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_code_tx(text, uuid) to service_role;

-- ── effective_entitlements: internal helper, service role only ────────────────
-- entitlements_for calls it as the function owner, so callers of entitlements_for are unaffected.
revoke execute on function public.effective_entitlements(uuid) from public, anon, authenticated;
grant execute on function public.effective_entitlements(uuid) to service_role;

-- ── entitlements_for: own row, an admin, or the service role ──────────────────
-- Same signature, return shape and result as 0018; only the caller check is new. The edge
-- function's service-role client passes the role check; the admin page passes is_admin().
create or replace function public.entitlements_for(p_user uuid)
returns table (ent jsonb, tier_label text, licence_ends_at_epoch_ms bigint) language plpgsql stable
security definer set search_path = public as $$
begin
  if not (coalesce(p_user = auth.uid(), false)
          or public.is_admin()
          or coalesce(auth.role() = 'service_role', false)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
    with winner as (
      select p.label, l.ends_at
      from public.licences l
      join public.products p on p.code = l.product_code
      where l.user_id = p_user and l.status = 'active' and l.ends_at > now()
      order by p.rank desc, l.ends_at desc
      limit 1
    )
    select
      public.effective_entitlements(p_user),
      coalesce((select w.label from winner w), 'Free'),
      (select (extract(epoch from w.ends_at) * 1000)::bigint from winner w);
end $$;

revoke execute on function public.entitlements_for(uuid) from public, anon;
grant execute on function public.entitlements_for(uuid) to authenticated, service_role;

-- ── Defaults for objects created from now on ──────────────────────────────────
-- New functions: no EXECUTE for PUBLIC or anon unless a migration grants it. The PUBLIC default
-- is global in Postgres and cannot be removed per schema (postgresql.org/docs/current/
-- sql-alterdefaultprivileges.html), so that line has no IN SCHEMA; it covers functions that
-- the postgres role creates in any schema. anon's grant comes from Supabase's per-schema default.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

-- New tables and views in public: nothing for anon unless a migration grants it.
alter default privileges for role postgres in schema public revoke all on tables from anon;
