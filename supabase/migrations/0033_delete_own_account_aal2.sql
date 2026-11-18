-- WIP #263 DEF149 (Robert: step-up yes): a member with a verified authenticator can delete their
-- account only from an AAL2 session. Members without one are unchanged. Gated step like 0032.
-- Only delete_own_account() changes: NOT entitlement-token. The Android app never calls this function.
-- Trusted-device sessions are aal1, so they are refused here too; the profile page asks for the code first.
-- Error: errcode 42501, message 'mfa_required'. Idempotent (create or replace; grants asserted below).

create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if exists (select 1 from auth.mfa_factors f
              where f.user_id = auth.uid() and f.status = 'verified')
     and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

do $$
begin
  if has_function_privilege('anon', 'public.delete_own_account()', 'execute')
     or not has_function_privilege('authenticated', 'public.delete_own_account()', 'execute') then
    raise exception '0033 post-condition: delete_own_account ACL wrong - aborted';
  end if;
end $$;
