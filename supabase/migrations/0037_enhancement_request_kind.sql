-- WIP #269 P3 slice 3.1: label each request as Support (something is wrong) or Enhancement
-- (something to improve). Same table, same queue, same admin flow and AI triage.
-- NOT YET APPLIED. Gated step: Holly review + Robert sign-off, then the gated migration runner.
-- Additive and idempotent: existing rows take the default 'enhancement'. No RLS change: the new
-- column is covered by the existing row policies on public.enhancement_requests, and clients still
-- cannot insert directly (migration 0026); the `dispatch` function writes it as service role.
-- Numbered 0037 because the P1 branch (beta_applications) takes 0036; apply in number order.

alter table public.enhancement_requests
  add column if not exists kind text not null default 'enhancement';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enhancement_requests_kind_check'
  ) then
    alter table public.enhancement_requests
      add constraint enhancement_requests_kind_check check (kind in ('enhancement', 'support'));
  end if;
end $$;

create index if not exists enhancement_requests_kind_idx on public.enhancement_requests (kind);
