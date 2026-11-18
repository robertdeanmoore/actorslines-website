-- WIP #263 DEF182: profiles.email was writable by its own user (profiles_update_own limits only role),
-- so a member could point find_user_by_email at someone else's address. Gated step like 0032.
--   1. Users can update display_name only. Every other column write goes through definer functions
--      (touch_last_seen, sync_profile_email, handle_new_user) or service_role, none affected.
--      Checked: the only .from("profiles").update in src/ is the display_name save (ProfilePage.tsx);
--      no admin role-change UI writes profiles over REST.
--   2. find_user_by_email resolves from auth.users.email (the source of truth), not the mirror.
-- Idempotent.

revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

create or replace function public.find_user_by_email(lookup_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = lower(lookup_email)
   limit 1;
$$;
revoke execute on function public.find_user_by_email(text) from public, anon;
grant execute on function public.find_user_by_email(text) to authenticated;

do $$
begin
  if has_column_privilege('authenticated', 'public.profiles', 'email', 'update')
     or has_column_privilege('authenticated', 'public.profiles', 'role', 'update')
     or not has_column_privilege('authenticated', 'public.profiles', 'display_name', 'update')
     or has_function_privilege('anon', 'public.find_user_by_email(text)', 'execute')
     or not has_function_privilege('authenticated', 'public.find_user_by_email(text)', 'execute') then
    raise exception '0034 post-condition: profiles/find_user_by_email ACL wrong - aborted';
  end if;
end $$;
