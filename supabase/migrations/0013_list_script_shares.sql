-- Lets a script owner see who they've shared a script with (by email, matching what they
-- typed in ShareScriptDialog) so they can revoke individual shares. Security definer for the
-- same reason as find_user_by_email: profiles_select_own only lets a user read their own row,
-- but the owner here legitimately needs the recipient's email. Ownership of the share rows
-- themselves is enforced explicitly inside the function (shared_by = auth.uid()), not by RLS.
create function public.list_script_shares(p_script_id bigint)
returns table (share_id bigint, email text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select sh.id, p.email, sh.created_at
  from public.learn_script_shares sh
  join public.profiles p on p.id = sh.shared_with
  where sh.script_id = p_script_id and sh.shared_by = auth.uid()
  order by sh.created_at desc;
$$;

revoke all on function public.list_script_shares(bigint) from public;
grant execute on function public.list_script_shares(bigint) to authenticated;
