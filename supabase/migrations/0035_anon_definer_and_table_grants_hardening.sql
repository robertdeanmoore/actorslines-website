-- WIP #265 Slice S10 (DEF189, DEF571, DEF572): defence-in-depth privilege hardening.
-- Gated migration: apply only after Holly approval line and Robert's named go via gated migration runner.
--
-- What this migration does:
--   1. Revokes PUBLIC and anon EXECUTE on all remaining pre-0022 SECURITY DEFINER functions (DEF189)
--      and invoker trigger functions, leaving EXECUTE only to the roles that actually call them:
--      - Client/RLS RPCs (admin_*, delete_own_account, touch_last_seen, list_script_shares,
--        is_admin, user_owns_script): authenticated + service_role only.
--      - Trigger functions (audit_licence_change, grant_trial_on_confirm, handle_new_user,
--        sync_profile_email, touch_learn_script, set_request_closed_at, stamp_ready_at):
--        service_role only (Postgres checks trigger function EXECUTE at CREATE TRIGGER time,
--        not when the trigger fires).
--   2. Revokes all anon table privileges across every table in schema public (DEF571, DEF572) and
--      revokes excess authenticated privileges (TRUNCATE, REFERENCES, TRIGGER, and unneeded write
--      verbs) on pre-0022 tables, preserving the exact SELECT/INSERT/UPDATE/DELETE and sequence
--      USAGE privileges required by the website and RLS policies.
--   3. Verifies post-conditions in a DO block (0 anon-executable security definer functions in
--      public; 0 anon table grants in public; authenticated column lock on public.profiles intact).
-- Idempotent: safe to run multiple times.

-- ── 1. Table grants hardening (DEF571, DEF572) ────────────────────────────────────────────
-- Revoke all table privileges from PUBLIC and anon on every pre-0022 public table (and re-assert
-- on 0024-0030 tables). No browser or Android flow queries PostgREST tables as anon.
revoke all on table
  public.profiles,
  public.enhancement_requests,
  public.request_messages,
  public.ai_reports,
  public.board_posts,
  public.votes,
  public.comments,
  public.dev_notes,
  public.plans,
  public.learn_scripts,
  public.learn_line_states,
  public.invites,
  public.learn_script_shares,
  public.learn_bookmarks,
  public.trusted_devices,
  public.telemetry_events,
  public.recognition_reports,
  public.products,
  public.licences,
  public.redemption_codes,
  public.licence_audit,
  public.mfa_verify_attempts,
  public.rate_limit_events,
  public.notify_signups,
  public.trial_used,
  public.trial_check_failed
from public, anon;

-- Strip excess authenticated privileges (TRUNCATE, REFERENCES, TRIGGER, and unused write verbs)
-- by revoking all and re-granting the exact verbs each table's RLS policies and UI callers use.
revoke all on table
  public.profiles,
  public.enhancement_requests,
  public.request_messages,
  public.ai_reports,
  public.board_posts,
  public.votes,
  public.comments,
  public.dev_notes,
  public.plans,
  public.learn_scripts,
  public.learn_line_states,
  public.invites,
  public.learn_script_shares,
  public.learn_bookmarks,
  public.trusted_devices,
  public.telemetry_events,
  public.recognition_reports,
  public.products,
  public.licences,
  public.redemption_codes,
  public.licence_audit,
  public.mfa_verify_attempts
from authenticated;

-- profiles: SELECT own/admin, UPDATE (display_name) only (preserving 0034_profiles_email_lock).
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- enhancement_requests: SELECT own/admin; UPDATE and DELETE admin-only via RLS (INSERT is via dispatch edge fn, 0026).
grant select, update, delete on table public.enhancement_requests to authenticated;

-- request_messages: SELECT and INSERT (author or admin via RLS).
grant select, insert on table public.request_messages to authenticated;

-- board_posts, votes, comments, dev_notes: full CRUD gated by RLS (0002).
grant select, insert, update, delete on table
  public.board_posts,
  public.votes,
  public.comments,
  public.dev_notes
to authenticated;

-- learn_scripts, learn_line_states: owner CRUD gated by RLS (0007, 0011).
grant select, insert, update, delete on table
  public.learn_scripts,
  public.learn_line_states
to authenticated;

-- learn_script_shares, learn_bookmarks: owner SELECT/INSERT/DELETE gated by RLS (0011, 0012, 0014).
grant select, insert, delete on table
  public.learn_script_shares,
  public.learn_bookmarks
to authenticated;

-- recognition_reports: admin SELECT and UPDATE (status triage on TelemetryPage, 0017).
grant select, update on table public.recognition_reports to authenticated;

-- Read-only tables for authenticated (own rows or admin-only via RLS):
grant select on table
  public.ai_reports,
  public.plans,
  public.invites,
  public.trusted_devices,
  public.telemetry_events,
  public.products,
  public.licences,
  public.redemption_codes,
  public.licence_audit,
  public.notify_signups
to authenticated;

-- Identity sequences on tables where authenticated inserts rows directly:
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on all sequences in schema public from public, anon;

-- ── 2. SECURITY DEFINER & trigger function EXECUTE hardening (DEF189) ────────────────────
-- 2a. Authenticated RPCs and RLS helper functions: revoke PUBLIC and anon, keep authenticated + service_role.
revoke execute on function public.admin_create_redemption_code(text, timestamptz, integer) from public, anon;
grant execute on function public.admin_create_redemption_code(text, timestamptz, integer) to authenticated, service_role;

revoke execute on function public.admin_grant_licence(uuid, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_grant_licence(uuid, text, timestamptz, timestamptz, text) to authenticated, service_role;

revoke execute on function public.admin_revoke_licence(bigint, text) from public, anon;
grant execute on function public.admin_revoke_licence(bigint, text) to authenticated, service_role;

revoke execute on function public.admin_search_users(text) from public, anon;
grant execute on function public.admin_search_users(text) to authenticated, service_role;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated, service_role;

revoke execute on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated, service_role;

revoke execute on function public.list_script_shares(bigint) from public, anon;
grant execute on function public.list_script_shares(bigint) to authenticated, service_role;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

revoke execute on function public.user_owns_script(bigint) from public, anon;
grant execute on function public.user_owns_script(bigint) to authenticated, service_role;

-- 2b. Trigger functions: never callable via PostgREST RPC; EXECUTE needed only at CREATE TRIGGER time.
revoke execute on function public.audit_licence_change() from public, anon, authenticated;
grant execute on function public.audit_licence_change() to service_role;

revoke execute on function public.grant_trial_on_confirm() from public, anon, authenticated;
grant execute on function public.grant_trial_on_confirm() to service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

revoke execute on function public.sync_profile_email() from public, anon, authenticated;
grant execute on function public.sync_profile_email() to service_role;

revoke execute on function public.touch_learn_script() from public, anon, authenticated;
grant execute on function public.touch_learn_script() to service_role;

revoke execute on function public.set_request_closed_at() from public, anon, authenticated;
grant execute on function public.set_request_closed_at() to service_role;

revoke execute on function public.stamp_ready_at() from public, anon, authenticated;
grant execute on function public.stamp_ready_at() to service_role;

-- ── 3. Post-conditions (fail transaction loudly if any privilege is wrong) ───────────────
do $$
declare
  v_anon_definers integer;
  v_anon_table_grants integer;
begin
  -- Zero SECURITY DEFINER functions in public may be executable by anon.
  select count(*) into v_anon_definers
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef = true
     and has_function_privilege('anon', p.oid, 'EXECUTE');

  if v_anon_definers > 0 then
    raise exception '0035 post-condition failed: % security definer function(s) in public still executable by anon', v_anon_definers;
  end if;

  -- Zero tables in public may grant any privilege to anon.
  select count(*) into v_anon_table_grants
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and (
       has_table_privilege('anon', c.oid, 'SELECT')
       or has_table_privilege('anon', c.oid, 'INSERT')
       or has_table_privilege('anon', c.oid, 'UPDATE')
       or has_table_privilege('anon', c.oid, 'DELETE')
       or has_table_privilege('anon', c.oid, 'TRUNCATE')
       or has_table_privilege('anon', c.oid, 'REFERENCES')
       or has_table_privilege('anon', c.oid, 'TRIGGER')
     );

  if v_anon_table_grants > 0 then
    raise exception '0035 post-condition failed: % public table(s) still hold anon privileges', v_anon_table_grants;
  end if;

  -- Verify 0034 column-level lock on public.profiles is preserved.
  if has_column_privilege('authenticated', 'public.profiles', 'email', 'update')
     or has_column_privilege('authenticated', 'public.profiles', 'role', 'update')
     or not has_column_privilege('authenticated', 'public.profiles', 'display_name', 'update') then
    raise exception '0035 post-condition failed: public.profiles column update lock broken';
  end if;

  -- Verify authenticated still holds EXECUTE on RLS helpers and client RPCs.
  if not has_function_privilege('authenticated', 'public.is_admin()', 'execute')
     or not has_function_privilege('authenticated', 'public.user_owns_script(bigint)', 'execute')
     or not has_function_privilege('authenticated', 'public.delete_own_account()', 'execute')
     or not has_function_privilege('authenticated', 'public.touch_last_seen()', 'execute') then
    raise exception '0035 post-condition failed: authenticated missing EXECUTE on required RPC/helper';
  end if;
end $$;
