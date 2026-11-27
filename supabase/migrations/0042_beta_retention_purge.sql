-- WIP #269 P5 slice 5.2a: beta/attachment retention purge.
-- (SQL drafted by the workhorse, reviewed line by line; RLS line added by the reviewer.)
-- NOT YET APPLIED. Gated step: Holly review + Robert data-risk sign-off, then the gated migration runner.
-- Needs 0036 (beta_applications), 0027 (enhancement_requests.closed_at) and 0040 (request_attachments).
--
-- Retention rules (Robert approved, WIP 269 D4):
--   - Rejected beta applications: personal data deleted 6 months after the decision (decided_at).
--   - Attachments (screenshot, audio): deleted 90 days after the request is closed (closed_at).
--   - Approved applicants' rows are kept until the tester's account is deleted (FK cascade below).
--   - Pending and withdrawn applications: NOT purged here — flagged for the owner.
--
-- Idempotent: create or replace function / create table if not exists / drop trigger if exists.

-- 1. Deletion queue for Storage objects.
create table if not exists public.attachment_deletions (
  storage_path text primary key,
  queued_at    timestamptz not null default now()
);
-- Queue of storage object paths whose database row is gone; the `lifecycle` edge
-- function removes the files through the Storage API then acknowledges.
-- Contains no personal data.
revoke all on public.attachment_deletions from public, anon, authenticated;
-- Row level security on, no policy: only the service role (bypasses RLS) and the definer functions below touch it.
alter table public.attachment_deletions enable row level security;

-- 2. Trigger: queue the storage path before a request_attachments row is removed.
-- Catches every delete path: account deletion cascade, request delete, retention purge.
create or replace function public.queue_attachment_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.attachment_deletions (storage_path)
  values (old.storage_path)
  on conflict (storage_path) do nothing;
  return old;
end;
$$;
revoke execute on function public.queue_attachment_deletion() from public, anon, authenticated;

drop trigger if exists request_attachments_queue_deletion on public.request_attachments;
create trigger request_attachments_queue_deletion
  before delete on public.request_attachments
  for each row execute function public.queue_attachment_deletion();

-- 3. Batch reader: oldest queued paths for the lifecycle function.
create or replace function public.attachment_deletions_batch(p_batch integer default 500)
returns setof text
language sql
security definer
set search_path = ''
as $$
  select storage_path
    from public.attachment_deletions
   order by queued_at, storage_path
   limit least(greatest(coalesce(p_batch, 500), 1), 1000);
$$;
revoke execute on function public.attachment_deletions_batch(integer) from public, anon, authenticated;
grant execute on function public.attachment_deletions_batch(integer) to service_role;

-- 4. Acknowledge: remove acknowledged paths, return the row count.
create or replace function public.attachment_deletions_ack(p_paths text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_paths is null or array_length(p_paths, 1) is null then
    return 0;
  end if;
  delete from public.attachment_deletions where storage_path = any (p_paths);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.attachment_deletions_ack(text[]) from public, anon, authenticated;
grant execute on function public.attachment_deletions_ack(text[]) to service_role;

-- 5. Retention purge for rejected beta applications and closed-request attachments.
create or replace function public.purge_beta_data(
  p_rejected_before           timestamptz default null,
  p_attachments_closed_before timestamptz default null,
  p_dry_run                   boolean default true,
  p_batch                     integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rej  timestamptz;
  v_att  timestamptz;
  b      integer;
  v_dry  boolean;
  n_rej  integer := 0;
  n_att  integer := 0;
begin
  -- Effective cutoffs can never be more recent than the stated retention:
  -- defence in depth, a bad caller cannot purge early.
  v_rej := least(coalesce(p_rejected_before, now()), now() - interval '6 months');
  v_att := least(coalesce(p_attachments_closed_before, now()), now() - interval '90 days');
  b     := least(greatest(coalesce(p_batch, 1000), 1), 5000);
  v_dry := coalesce(p_dry_run, true);

  if v_dry then
    -- Count only, no delete.
    select count(*) into n_rej
      from public.beta_applications
     where status = 'rejected'
       and decided_at is not null
       and decided_at < v_rej;

    select count(*) into n_att
      from public.request_attachments ra
      join public.enhancement_requests er on er.id = ra.request_id
     where er.closed_at is not null
       and er.closed_at < v_att;

    return jsonb_build_object('dry_run', true, 'rejected_applications', n_rej, 'attachments', n_att);
  end if;

  -- Rejected applications past retention.
  delete from public.beta_applications
   where id in (
     select id from public.beta_applications
      where status = 'rejected'
        and decided_at is not null
        and decided_at < v_rej
      order by id
      limit b
   );
  get diagnostics n_rej = row_count;

  -- Attachments of requests closed past retention.
  delete from public.request_attachments
   where id in (
     select ra.id
       from public.request_attachments ra
       join public.enhancement_requests er on er.id = ra.request_id
      where er.closed_at is not null
        and er.closed_at < v_att
      order by ra.id
      limit b
   );
  get diagnostics n_att = row_count;

  return jsonb_build_object('dry_run', false, 'rejected_applications', n_rej, 'attachments', n_att);
end;
$$;
revoke execute on function public.purge_beta_data(timestamptz, timestamptz, boolean, integer) from public, anon, authenticated;
grant execute on function public.purge_beta_data(timestamptz, timestamptz, boolean, integer) to service_role;

-- 6. Account deletion coverage: deleting an auth user deletes their beta application
-- row (the personal data goes with the account). Covers both delete_own_account()
-- and the lifecycle inactivity delete.
do $$
begin
  alter table public.beta_applications
    drop constraint if exists beta_applications_user_id_fkey;
  alter table public.beta_applications
    add constraint beta_applications_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
end;
$$;

-- Post-condition: fail the migration if any of the 4 functions is executable by
-- anon or authenticated, or if service_role cannot execute purge_beta_data.
do $$
begin
  if has_function_privilege('anon', 'public.attachment_deletions_batch(integer)', 'execute')
     or has_function_privilege('authenticated', 'public.attachment_deletions_batch(integer)', 'execute')
     or has_function_privilege('anon', 'public.attachment_deletions_ack(text[])', 'execute')
     or has_function_privilege('authenticated', 'public.attachment_deletions_ack(text[])', 'execute')
     or has_function_privilege('anon', 'public.purge_beta_data(timestamptz, timestamptz, boolean, integer)', 'execute')
     or has_function_privilege('authenticated', 'public.purge_beta_data(timestamptz, timestamptz, boolean, integer)', 'execute')
     or not has_function_privilege('service_role', 'public.purge_beta_data(timestamptz, timestamptz, boolean, integer)', 'execute') then
    raise exception 'WIP #269 0042: retention function privilege check failed';
  end if;
end;
$$;
