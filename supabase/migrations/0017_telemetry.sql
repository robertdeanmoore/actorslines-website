-- Anonymous, opt-in app telemetry from the Actors Lines Android app.
-- See the ActorsVoice repo: docs/features/telemetry.md.
--
-- Ingested by the `telemetry` edge function using the service role (which bypasses RLS).
-- No anon/authenticated client may read or write these tables directly except admins, who
-- read via the policies + security-definer aggregate views below. The install_id is a random,
-- app-generated, user-resettable value — never linked to an account or auth.users.

create type public.recognition_report_kind as enum ('ocr', 'speech');
create type public.recognition_report_status as enum ('new', 'triaged', 'resolved');

-- ── usage events ─────────────────────────────────────────────────────────────
create table public.telemetry_events (
  id bigint generated always as identity primary key,
  install_id text not null check (char_length(install_id) <= 64),
  event_name text not null check (char_length(event_name) <= 64),
  params jsonb not null default '{}'::jsonb,
  app_version text check (char_length(app_version) <= 32),
  device_class text check (char_length(device_class) <= 200),
  received_at timestamptz not null default now()
);
create index telemetry_events_name_time_idx on public.telemetry_events (event_name, received_at desc);
create index telemetry_events_install_idx on public.telemetry_events (install_id);
create index telemetry_events_received_idx on public.telemetry_events (received_at desc);

-- ── recognition problem reports (carry short, user-confirmed script snippets) ──
create table public.recognition_reports (
  id bigint generated always as identity primary key,
  install_id text not null check (char_length(install_id) <= 64),
  kind public.recognition_report_kind not null,
  recognized_text text check (char_length(recognized_text) <= 2000),
  expected_text text check (char_length(expected_text) <= 2000),
  engine text check (char_length(engine) <= 40),
  confidence real,
  note text check (char_length(note) <= 500),
  -- Reserved for a future cropped-OCR-region attachment (Supabase Storage ref); unused in v1.
  image_path text,
  app_version text check (char_length(app_version) <= 32),
  device_class text check (char_length(device_class) <= 200),
  status public.recognition_report_status not null default 'new',
  received_at timestamptz not null default now()
);
create index recognition_reports_status_time_idx on public.recognition_reports (status, received_at desc);

-- ── RLS: locked down; service role (edge function) bypasses it ────────────────
alter table public.telemetry_events enable row level security;
alter table public.recognition_reports enable row level security;

create policy telemetry_events_admin_read on public.telemetry_events
  for select using (public.is_admin());

create policy recognition_reports_admin_read on public.recognition_reports
  for select using (public.is_admin());

-- Admins triage reports (status new → triaged → resolved) from the dashboard.
create policy recognition_reports_admin_update on public.recognition_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ── Aggregate views for the admin dashboard ───────────────────────────────────
-- Security-definer so aggregation runs with owner rights, but each view is gated on
-- public.is_admin() so a non-admin authenticated user sees no rows. No raw rows or
-- install ids are ever exposed through these.

create view public.telemetry_event_counts
with (security_invoker = off) as
select
  event_name,
  count(*)                   as total,
  count(distinct install_id) as installs,
  max(received_at)           as last_seen
from public.telemetry_events
where public.is_admin()
group by event_name;

revoke all on public.telemetry_event_counts from anon, public;
grant select on public.telemetry_event_counts to authenticated;

-- Breakdown by the meaningful value inside each event: the feature used, or the setting
-- key + its new value. Drives the "what gets used / changed from default" panels.
create view public.telemetry_value_counts
with (security_invoker = off) as
select
  event_name,
  coalesce(params ->> 'feature', params ->> 'key') as item,
  params ->> 'value'                               as value,
  count(*)                                         as total,
  count(distinct install_id)                       as installs
from public.telemetry_events
where public.is_admin()
group by event_name, item, value;

revoke all on public.telemetry_value_counts from anon, public;
grant select on public.telemetry_value_counts to authenticated;
