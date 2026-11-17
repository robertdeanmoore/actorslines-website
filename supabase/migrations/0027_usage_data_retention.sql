-- WIP #257 blocker B2: enforce the retention the Privacy page promises.
--   * anonymous usage data (telemetry_events) and recognition reports: 12 months from collection
--   * support messages (request_messages): 12 months after the case closes
--   * trusted-device records and invitation records: "removed within 90 days" (Privacy page, PR 67)
-- NOT YET APPLIED. Gated step: Holly review + Robert data-risk sign-off, then
-- Scripts/supabase_migrate.sh --gate WIP#257 (Skills/applying-supabase-migration). The first
-- run after apply deletes the telemetry/report backlog older than 12 months, irreversibly
-- (request threads of already-closed cases are not in that backlog: see the back-fill below).
-- Design: RobLife Deliverables "Actors Lines - Usage Data Purge Design 2026-11-14.md".
-- Scheduled from the daily `lifecycle` edge function (redeploy it after applying this).
-- Enhancement requests, board posts, comments, votes and AI reports are NOT purged here: the
-- Privacy page gives them account-lifetime retention, and a purge would wipe the public board.

-- 1. Record when a case closed. updated_at is not maintained on status changes, so it cannot
--    answer "12 months after the case closes". Terminal = implemented, closed, rejected, abandoned.
alter table public.enhancement_requests add column closed_at timestamptz;

create function public.set_request_closed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status in ('implemented', 'closed', 'rejected', 'abandoned') then
    if old.status is distinct from new.status and old.status not in ('implemented', 'closed', 'rejected', 'abandoned') then
      new.closed_at := now();
    elsif new.closed_at is null then
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;          -- reopened
  end if;
  return new;
end;
$$;

create trigger enhancement_requests_set_closed_at
  before update of status on public.enhancement_requests
  for each row execute function public.set_request_closed_at();

-- One-off back-fill for cases already closed: the real close date is unknown (updated_at is
-- untouched by status changes, so it is about the creation date and would purge threads of
-- recently closed old cases up to 12 months early, irreversibly). Grace instead: treat them as
-- closed at apply time, so their threads are first purged 12 months after this migration.
update public.enhancement_requests
   set closed_at = now()
 where status in ('implemented', 'closed', 'rejected', 'abandoned') and closed_at is null;

-- 2. Age index for the purge (0017 only indexes status + time).
create index recognition_reports_received_idx on public.recognition_reports (received_at);

-- 3. The purge. Service role only. At most p_batch rows per table per call, so a backlog never
--    holds one huge transaction; the caller loops until a table returns less than a full batch.
--    Idempotent. Returns counts only, never content.
create function public.purge_usage_data(p_batch integer default 5000)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  b integer := least(greatest(coalesce(p_batch, 5000), 1), 20000);
  cutoff timestamptz := now() - interval '12 months';
  n_events integer;
  n_reports integer;
  n_messages integer;
  n_devices integer;
  n_invites integer;
begin
  delete from public.telemetry_events
   where id in (select id from public.telemetry_events where received_at < cutoff order by received_at limit b);
  get diagnostics n_events = row_count;

  delete from public.recognition_reports
   where id in (select id from public.recognition_reports where received_at < cutoff order by received_at limit b);
  get diagnostics n_reports = row_count;

  -- Only closed cases: an open or live case keeps its thread.
  delete from public.request_messages
   where id in (
     select m.id from public.request_messages m
       join public.enhancement_requests r on r.id = m.request_id
      where r.closed_at is not null and r.closed_at < cutoff
      limit b);
  get diagnostics n_messages = row_count;

  -- Trusted devices: the Privacy page says records expire after 30 days and are removed within
  -- 90 days. expires_at is created_at + 30 days (not sliding), so 30 days past the earlier of
  -- expiry and revocation is at most about 60 days after creation: inside the promise with a
  -- month spare for the daily schedule and any backlog. Live (unexpired, unrevoked) rows stay.
  delete from public.trusted_devices
   where id in (
     select id from public.trusted_devices
      where least(expires_at, coalesce(revoked_at, expires_at)) < now() - interval '30 days'
      limit b);
  get diagnostics n_devices = row_count;

  -- Invitations: "until used or expired, then removed within 90 days". Clock starts at the earlier
  -- of acceptance and expiry; delete 30 days later (same margin). Pending, unexpired invitations
  -- stay. The email address on the row is what this removes; accepted_user_id is only a link.
  delete from public.invites
   where id in (
     select id from public.invites
      where least(expires_at, coalesce(accepted_at, expires_at)) < now() - interval '30 days'
      limit b);
  get diagnostics n_invites = row_count;

  return jsonb_build_object('batch', b, 'telemetry_events', n_events,
                            'recognition_reports', n_reports, 'request_messages', n_messages,
                            'trusted_devices', n_devices, 'invites', n_invites);
end;
$$;
revoke execute on function public.purge_usage_data(integer) from public, anon, authenticated;
grant execute on function public.purge_usage_data(integer) to service_role;
