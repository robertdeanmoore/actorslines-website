-- WIP #269 P2 slice 2.1/2.2: server-side accept (cap-safe) and licence grant for beta applicants.
-- NOT YET APPLIED. Gated step: Holly review (SECURITY DEFINER, licence write) + Robert sign-off,
-- then the gated migration runner (Skills/applying-supabase-migration). Needs 0038 (grant columns),
-- 0036 (beta_applications) and 0018 (licences, audit trigger).
--
-- Why a new RPC and not admin_grant_licence: that function checks is_admin() against auth.uid(), so it
-- only works with an admin's own JWT. The licence has to be written when the *invitee* accepts their
-- invite (the user does not exist at approval), and that call comes from the `invite` edge function
-- with the service role, where auth.uid() is null. beta_apply_grant writes the same licences row
-- admin_grant_licence would (source 'admin', same audit trigger), recorded against the approving admin.
-- Both functions are service_role only: never callable from the browser.

-- ── beta_accept: atomic Pending -> Approved with the 50-place cap ─────────────────────────────
-- Advisory lock + row lock make "count approved, then approve" one step, so two simultaneous accepts
-- cannot both take the last place (AC2.5), and a replay is a no-op (AC2.6).
create or replace function public.beta_accept(p_id bigint, p_admin uuid, p_cap integer)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_used integer;
begin
  -- Defence in depth: the edge function already checked, but a bad p_admin must not be recorded as decider.
  if p_admin is null or not exists (select 1 from public.profiles where id = p_admin and role = 'admin') then
    return 'forbidden';
  end if;
  perform pg_advisory_xact_lock(hashtext('beta_applications_cap'));
  select status into v_status from public.beta_applications where id = p_id for update;
  if v_status is null then return 'not_found'; end if;
  if v_status = 'approved' then return 'already'; end if;
  if v_status <> 'pending' then return 'not_pending'; end if;

  select count(*) into v_used from public.beta_applications where status = 'approved';
  if v_used >= p_cap then return 'cap_full'; end if;

  -- The grant intent (D2): stored now, applied when the invitee's account exists.
  update public.beta_applications
  set status = 'approved', decided_at = now(), decided_by = p_admin,
      grant_product = 'unlimited_6mo', grant_months = 6
  where id = p_id;
  return 'approved';
end $$;

revoke execute on function public.beta_accept(bigint, uuid, integer) from public, anon, authenticated;
grant execute on function public.beta_accept(bigint, uuid, integer) to service_role;

-- ── beta_apply_grant: write the licence once, for the matching user only ──────────────────────
-- Returns the licence id. Idempotent: a second call returns the same id and writes nothing.
create or replace function public.beta_apply_grant(p_application_id bigint, p_user uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  a public.beta_applications%rowtype;
  v_email text;
  v_confirmed timestamptz;
  v_id bigint;
begin
  select * into a from public.beta_applications where id = p_application_id for update;
  if not found then raise exception 'application not found'; end if;
  if a.status <> 'approved' then raise exception 'application is not approved'; end if;
  if a.grant_product is null or a.grant_months is null then raise exception 'no grant recorded'; end if;
  if a.grant_applied_at is not null then return a.licence_id; end if;

  -- The grant can only land on the account that owns the applied-with email. Public signup creates an
  -- auth.users row (and a profiles row) for an email nobody has proved they own, so a matching address
  -- is not enough: the address must be confirmed, or a squatter could take the licence.
  select lower(email), email_confirmed_at into v_email, v_confirmed from auth.users where id = p_user;
  if v_email is null or v_email <> a.email then raise exception 'user does not match application'; end if;
  if v_confirmed is null then raise exception 'email not confirmed'; end if;

  perform set_config('app.audit_actor', coalesce(a.decided_by::text, ''), true);
  perform set_config('app.audit_via', 'beta_grant', true);
  perform set_config('app.audit_note', 'beta application #' || a.id, true);

  insert into public.licences (user_id, product_code, starts_at, ends_at, source, status)
  values (p_user, a.grant_product, now(), now() + make_interval(months => a.grant_months), 'admin', 'active')
  returning id into v_id;

  update public.beta_applications
  set user_id = p_user, grant_applied_at = now(), licence_id = v_id
  where id = a.id;
  return v_id;
end $$;

revoke execute on function public.beta_apply_grant(bigint, uuid) from public, anon, authenticated;
grant execute on function public.beta_apply_grant(bigint, uuid) to service_role;

-- Post-condition (as 0034/0035): both functions are service_role only.
do $$
begin
  if has_function_privilege('anon', 'public.beta_accept(bigint, uuid, integer)', 'execute')
     or has_function_privilege('authenticated', 'public.beta_accept(bigint, uuid, integer)', 'execute')
     or not has_function_privilege('service_role', 'public.beta_accept(bigint, uuid, integer)', 'execute')
     or has_function_privilege('anon', 'public.beta_apply_grant(bigint, uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.beta_apply_grant(bigint, uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.beta_apply_grant(bigint, uuid)', 'execute') then
    raise exception '0039 post-condition: beta_accept/beta_apply_grant ACL wrong - aborted';
  end if;
end $$;
