-- Fixes 42P17 "infinite recursion detected in policy for relation learn_script_shares".
-- learn_script_shares_owner's WITH CHECK queried learn_scripts to confirm ownership; that
-- SELECT on learn_scripts triggers learn_scripts_shared_select, which queries back into
-- learn_script_shares — Postgres implements RLS via query rewriting, not a memoized
-- recursive CTE, so that two-table cycle never bottoms out. Same class of bug is_admin()
-- was already written to avoid (see its comment in 0001_initial.sql) — same fix here:
-- move the cross-table check into a security definer function so it's an opaque call
-- rather than a substituted subquery.
create function public.user_owns_script(p_script_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.learn_scripts where id = p_script_id and user_id = auth.uid()
  );
$$;

revoke all on function public.user_owns_script(bigint) from public;
grant execute on function public.user_owns_script(bigint) to authenticated;

drop policy "learn_script_shares_owner" on public.learn_script_shares;

create policy "learn_script_shares_owner" on public.learn_script_shares
  for all using (shared_by = auth.uid())
  with check (shared_by = auth.uid() and public.user_owns_script(script_id));
