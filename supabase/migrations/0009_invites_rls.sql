-- Admin-only, like dev_notes/plans/ai_reports — the public "check"/"accept" actions never
-- query this table directly from the browser, they go through the invite edge function's
-- service-role client, which bypasses RLS entirely. So no anon/authenticated policy is needed.

alter table public.invites enable row level security;

create policy "invites_admin" on public.invites
  for all using (public.is_admin());
