-- Learn Lines bookmarks: a web-only proxy for the app's "sections" concept (not linked to it).
-- The actor long-presses/holds a line in the practice list to drop a short-labelled marker,
-- which then also appears nested under its scene in the scene list for one-tap navigation.
-- Positional (scene_index/line_index), same precedent as learn_line_states.line_key.

create table public.learn_bookmarks (
  id bigint generated always as identity primary key,
  script_id bigint not null references public.learn_scripts(id) on delete cascade,
  scene_index int not null,
  line_index int not null,
  label text not null check (char_length(label) between 1 and 20),
  created_at timestamptz not null default now()
);

create index learn_bookmarks_script_id_idx on public.learn_bookmarks(script_id);

alter table public.learn_bookmarks enable row level security;

create policy "learn_bookmarks_select" on public.learn_bookmarks
  for select using (exists (
    select 1 from public.learn_scripts s where s.id = script_id and s.user_id = auth.uid()));
create policy "learn_bookmarks_insert" on public.learn_bookmarks
  for insert with check (exists (
    select 1 from public.learn_scripts s where s.id = script_id and s.user_id = auth.uid()));
create policy "learn_bookmarks_delete" on public.learn_bookmarks
  for delete using (exists (
    select 1 from public.learn_scripts s where s.id = script_id and s.user_id = auth.uid()));
