-- Inlet pipe: admin marks a request "Ready for development"; the `inlet` edge function hands it to the NAS.
-- Additive only: one enum value, two nullable columns, one trigger. No row change, no RLS change
-- (the inlet function uses the service role; authors can already select their own row, admins all).
-- Design: RobLife Deliverables/Actors Lines - Inlet Pipe Design 2026-11-17.md.

alter type public.request_status add value if not exists 'ready_for_dev';

alter table public.enhancement_requests
  add column if not exists ready_at timestamptz,
  add column if not exists inlet_acked_at timestamptz;

-- ready_at is stamped by the database whenever status is written as ready_for_dev, so re-marking
-- refreshes it (the NAS then re-pulls). The literal is compared at run time, so this is safe in the
-- same transaction as the enum add above.
create or replace function public.stamp_ready_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'ready_for_dev' then
    new.ready_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists enhancement_requests_stamp_ready_at on public.enhancement_requests;
create trigger enhancement_requests_stamp_ready_at
  before update of status on public.enhancement_requests
  for each row execute function public.stamp_ready_at();
