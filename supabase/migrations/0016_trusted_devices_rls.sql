-- Admin-only, like invites — the "issue"/"check" actions never query this table
-- directly from the browser, they go through the trusted-device edge function's
-- service-role client, which bypasses RLS entirely. So no anon/authenticated policy
-- is needed for normal use; the admin policy is just for support/debugging.

alter table public.trusted_devices enable row level security;

create policy "trusted_devices_admin" on public.trusted_devices
  for all using (public.is_admin());
