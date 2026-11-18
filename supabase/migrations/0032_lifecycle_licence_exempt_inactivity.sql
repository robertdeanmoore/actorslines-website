-- WIP #263 DEF190 option (b) (Robert 2026-11-17/18): accounts with an ACTIVE LICENCE are exempt from
-- inactivity deletion. Not applied by this file's presence: gated step (Holly review + Robert's named
-- go, then Scripts/supabase_migrate.sh --gate, Skills/applying-supabase-migration). Idempotent.
--
-- Active licence (Holly, WIP #263 rulings s.3): status = 'active' AND ends_at > now() AND source <> 'trial'.
-- Trials never count (Robert). Revoked, refunded and expired do not count. Orphaned rows (user_id null,
-- DEF555) never match a profile. comp_rolling licences are re-extended nightly, so their holders stay exempt.
--
-- Two service_role-only functions, called by supabase/functions/lifecycle (inactivity.ts):
--   lifecycle_has_active_licence(p_user)     the single predicate; also re-read right before a deletion.
--   lifecycle_inactive_profiles(p_cutoff)    stale profiles, each flagged exempt. Non-exempt rows are only
--       those whose clock is older than the cutoff, where
--         clock = greatest(last_seen_at, latest end of any non-trial active-status licence, capped at now())
--       so after a licence ends the 5-month / 2-week / 2-week sequence restarts from the licence end.
--       Warning stamps older than that licence end are returned as null (stale: never delete on the
--       strength of stamps that pre-date a licence). Exempt rows are returned so the job can clear
--       their stamps and count them (summary.inactivityExempt).

create or replace function public.lifecycle_has_active_licence(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.licences l
     where l.user_id = p_user
       and l.status = 'active'
       and l.ends_at > now()
       and l.source <> 'trial'
  );
$$;
revoke execute on function public.lifecycle_has_active_licence(uuid) from public, anon, authenticated;
grant execute on function public.lifecycle_has_active_licence(uuid) to service_role;

create or replace function public.lifecycle_inactive_profiles(p_cutoff timestamptz)
returns table (
  id uuid,
  last_seen_at timestamptz,
  inactivity_warned_1_at timestamptz,
  inactivity_warned_2_at timestamptz,
  exempt boolean
) language sql stable security definer set search_path = '' as $$
  select p.id,
         p.last_seen_at,
         case when lic.ended_at is not null and p.inactivity_warned_1_at < lic.ended_at
              then null else p.inactivity_warned_1_at end,
         case when lic.ended_at is not null and p.inactivity_warned_2_at < lic.ended_at
              then null else p.inactivity_warned_2_at end,
         lic.active
    from public.profiles p
    cross join lateral (
      select public.lifecycle_has_active_licence(p.id) as active,
             (select max(least(l.ends_at, now()))
                from public.licences l
               where l.user_id = p.id and l.status = 'active' and l.source <> 'trial'
                 and l.ends_at <= now()) as ended_at
    ) lic
   where p.last_seen_at < p_cutoff
     and (lic.active or greatest(p.last_seen_at, coalesce(lic.ended_at, p.last_seen_at)) < p_cutoff)
   order by p.id;
$$;
revoke execute on function public.lifecycle_inactive_profiles(timestamptz) from public, anon, authenticated;
grant execute on function public.lifecycle_inactive_profiles(timestamptz) to service_role;

-- Post-condition: only service_role may execute either function.
do $$
begin
  if has_function_privilege('anon', 'public.lifecycle_has_active_licence(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.lifecycle_has_active_licence(uuid)', 'execute')
     or has_function_privilege('anon', 'public.lifecycle_inactive_profiles(timestamptz)', 'execute')
     or has_function_privilege('authenticated', 'public.lifecycle_inactive_profiles(timestamptz)', 'execute')
     or not has_function_privilege('service_role', 'public.lifecycle_has_active_licence(uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.lifecycle_inactive_profiles(timestamptz)', 'execute') then
    raise exception '0032 post-condition: function ACL wrong - aborted';
  end if;
end $$;
