-- WIP #257 blocker B2: enforce the retention the Privacy page promises.
--   * anonymous usage data (telemetry_events) and recognition reports: 12 months from collection
--   * support messages (request_messages): 12 months after the case closes
-- NOT YET APPLIED. Gated step: Holly review + Robert data-risk sign-off, then
-- Scripts/supabase_migrate.sh --gate WIP#257 (Skills/applying-supabase-migration). The first
-- run after apply deletes the whole backlog older than 12 months, irreversibly.
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

-- One-off back-fill for cases already closed: best available date is updated_at (at worst the
-- creation date, so older cases are treated as closed earlier, never later, than they were).
update public.enhancement_requests
   set closed_at = updated_at
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

  return jsonb_build_object('batch', b, 'telemetry_events', n_events,
                            'recognition_reports', n_reports, 'request_messages', n_messages);
end;
$$;
revoke execute on function public.purge_usage_data(integer) from public, anon, authenticated;
grant execute on function public.purge_usage_data(integer) to service_role;
