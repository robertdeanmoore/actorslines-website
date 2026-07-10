-- Learn Lines: web replica of the app's Practice screen (read-only display + hide/show only).
-- learn_scripts holds the parsed cast-export JSON, written once at upload and never mutated.
-- learn_line_states holds the frequently-written per-line reveal mode, kept separate so a tap
-- never rewrites the (potentially large) script blob.

create table public.learn_scripts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  schema_version int not null,
  my_character_name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learn_scripts_user_id_idx on public.learn_scripts(user_id);

-- line_key is `${sceneIndex}:${lineIndex}` — the line's 0-based position within
-- data.scenes[sceneIndex].lines[lineIndex]. LineExport has no id/uuid in the DTO, only
-- positional order, and learn_scripts.data is immutable after insert, so this stays stable
-- for the row's lifetime (mirrors the app's own precedent of positional-index personal state
-- on cast import, e.g. reviewedLineIndexes).
create table public.learn_line_states (
  id bigint generated always as identity primary key,
  script_id bigint not null references public.learn_scripts(id) on delete cascade,
  line_key text not null,
  reveal_mode text not null default 'VISIBLE'
    check (reveal_mode in ('VISIBLE','HIDDEN','FIRST_WORD','FIRST_LETTERS','RANDOM')),
  updated_at timestamptz not null default now(),
  unique (script_id, line_key)
);

create index learn_line_states_script_id_idx on public.learn_line_states(script_id);

-- Keep learn_scripts.updated_at fresh so "My Scripts" can sort by last-practiced.
create function public.touch_learn_script()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.learn_scripts set updated_at = now() where id = new.script_id;
  return new;
end $$;

create trigger on_learn_line_state_change
  after insert or update on public.learn_line_states
  for each row execute function public.touch_learn_script();
