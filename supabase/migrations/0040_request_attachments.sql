-- WIP #269 P4 slice 4.1a: in-app request reports get source metadata columns and an
-- attachments table (one image and one audio at most per request).
-- NOT YET APPLIED. Gated step: Holly review + Robert sign-off, then the gated migration runner.
-- Additive and idempotent. No RLS statements here: access policies for public.request_attachments
-- are added by the reviewer in 0041.
-- App rows map subject -> title and description -> goal; web rows keep their old limits exactly.
-- Private bucket `request-attachments` holds the files (created in 0041); rows are written only by
-- the `submit-request-app` edge function with the service role; admin read policy is added in 0041;
-- retention (90 days after the request closes) is in 0042. No raw file content in the database.

-- Part A: new columns on public.enhancement_requests

alter table public.enhancement_requests
  add column if not exists source text not null default 'web' check (source in ('web', 'app'));

alter table public.enhancement_requests
  add column if not exists app_version text check (app_version is null or char_length(app_version) <= 40);

alter table public.enhancement_requests
  add column if not exists device_model text check (device_model is null or char_length(device_model) <= 80);

alter table public.enhancement_requests
  add column if not exists android_sdk integer check (android_sdk is null or android_sdk between 1 and 99);

alter table public.enhancement_requests
  add column if not exists attachments_complete boolean not null default true;

-- Relax the title and goal length rules for in-app reports only (source = 'app'): drop the
-- existing unnamed/named length checks, then add source-aware named checks. Skip the new names so
-- a re-run is clean.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.enhancement_requests'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) like '%char_length(title)%'
        or pg_get_constraintdef(oid) like '%char_length(goal)%'
      )
      and conname not in ('enhancement_requests_title_len', 'enhancement_requests_goal_len')
  loop
    execute format('alter table public.enhancement_requests drop constraint %I', c.conname);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enhancement_requests'::regclass
      and conname = 'enhancement_requests_title_len'
  ) then
    alter table public.enhancement_requests
      add constraint enhancement_requests_title_len check (
        (source = 'web' and char_length(title) between 5 and 80)
        or (source = 'app' and char_length(title) between 3 and 120)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enhancement_requests'::regclass
      and conname = 'enhancement_requests_goal_len'
  ) then
    alter table public.enhancement_requests
      add constraint enhancement_requests_goal_len check (
        (source = 'web' and char_length(goal) between 30 and 2000)
        or (source = 'app' and char_length(goal) between 10 and 4000)
      );
  end if;
end $$;

create index if not exists enhancement_requests_source_idx on public.enhancement_requests (source);

-- Part B: new table public.request_attachments

create table if not exists public.request_attachments (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.enhancement_requests (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('image', 'audio')),
  declared_mime text not null check (
    declared_mime in (
      'image/jpeg', 'image/png', 'image/webp',
      'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/mpeg'
    )
  ),
  declared_size integer not null check (declared_size > 0),
  storage_path text not null unique check (
    storage_path ~ '^request/[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|m4a|aac|ogg|mp3)$'
  ),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint request_attachments_kind_mime_agreement check (
    (kind = 'image' and declared_mime like 'image/%')
    or (kind = 'audio' and declared_mime like 'audio/%')
  ),
  constraint request_attachments_size_caps check (
    (kind = 'image' and declared_size <= 5242880)
    or (kind = 'audio' and declared_size <= 3145728)
  ),
  constraint request_attachments_status_confirmed_at check (
    (status = 'confirmed') = (confirmed_at is not null)
  )
);

create unique index if not exists request_attachments_one_per_kind_idx
  on public.request_attachments (request_id, kind);

create index if not exists request_attachments_owner_id_idx
  on public.request_attachments (owner_id);

create index if not exists request_attachments_status_created_at_idx
  on public.request_attachments (status, created_at);

-- Post-condition: fail loudly if the pieces above are missing.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'enhancement_requests'
      and column_name = 'attachments_complete'
  ) then
    raise exception 'WIP #269 0040: enhancement_requests.attachments_complete missing';
  end if;
  if to_regclass('public.request_attachments') is null then
    raise exception 'WIP #269 0040: table public.request_attachments missing';
  end if;
end $$;
