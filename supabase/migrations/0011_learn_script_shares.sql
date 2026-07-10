-- Cast sharing for Learn Lines: the owner of a script shares it with other registered users
-- by email; recipients see it under "Adopt shared script" and, if they adopt it, get their
-- own independent learn_scripts row (same path as a fresh upload — see LearnScriptsPage's
-- handleImport, reused for both). Re-adopting creates another independent copy, by design.

create table public.learn_script_shares (
  id bigint generated always as identity primary key,
  script_id bigint not null references public.learn_scripts(id) on delete cascade,
  shared_by uuid not null references public.profiles(id) on delete cascade,
  shared_with uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (script_id, shared_with)
);

create index learn_script_shares_shared_with_idx on public.learn_script_shares(shared_with);
create index learn_script_shares_script_id_idx on public.learn_script_shares(script_id);

alter table public.learn_script_shares enable row level security;

-- Owners manage the shares they created (share_with insert requires they also own the
-- script being shared — enforced in the WITH CHECK, not just at the API layer).
create policy "learn_script_shares_owner" on public.learn_script_shares
  for all using (shared_by = auth.uid())
  with check (
    shared_by = auth.uid()
    and exists (select 1 from public.learn_scripts s where s.id = script_id and s.user_id = auth.uid())
  );

-- Recipients can see (only) shares addressed to them.
create policy "learn_script_shares_recipient_select" on public.learn_script_shares
  for select using (shared_with = auth.uid());

-- Recipients get read-only access to a script's data once it's shared with them — needed to
-- preview/adopt it. They still can't see it in a plain "my scripts" query since that query
-- also filters on user_id = auth.uid() in learn_scripts_all_own; this policy only adds
-- visibility, it doesn't change ownership or writability.
create policy "learn_scripts_shared_select" on public.learn_scripts
  for select using (
    exists (
      select 1 from public.learn_script_shares sh
      where sh.script_id = learn_scripts.id and sh.shared_with = auth.uid()
    )
  );

-- Resolves a registered user's id from their email, for the share-by-email flow. Returns
-- only the id — never the email or any other profile field — so it can't be used to
-- enumerate registered users' details, only to test one address at a time while sharing.
create function public.find_user_by_email(lookup_email text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where lower(email) = lower(lookup_email) limit 1;
$$;

revoke all on function public.find_user_by_email(text) from public;
grant execute on function public.find_user_by_email(text) to authenticated;
