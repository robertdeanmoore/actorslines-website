-- Learn Lines RLS: strictly owner-only, no admin/shared visibility needed (unlike the
-- board/requests tables — a user's uploaded script and reveal progress are private).

alter table public.learn_scripts enable row level security;
alter table public.learn_line_states enable row level security;

create policy "learn_scripts_all_own" on public.learn_scripts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "learn_line_states_select" on public.learn_line_states
  for select using (exists (
    select 1 from public.learn_scripts s where s.id = script_id and s.user_id = auth.uid()));
create policy "learn_line_states_insert" on public.learn_line_states
  for insert with check (exists (
    select 1 from public.learn_scripts s where s.id = script_id and s.user_id = auth.uid()));
create policy "learn_line_states_update" on public.learn_line_states
  for update using (exists (
    select 1 from public.learn_scripts s where s.id = script_id and s.user_id = auth.uid()));
create policy "learn_line_states_delete" on public.learn_line_states
  for delete using (exists (
    select 1 from public.learn_scripts s where s.id = script_id and s.user_id = auth.uid()));
