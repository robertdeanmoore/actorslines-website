-- "Trust this device for 30 days": lets a user skip the TOTP challenge on a browser
-- they've already verified once. Only a hash of the device token is stored — the raw
-- token lives in the user's browser and is never persisted server-side. All reads/
-- writes go through the trusted-device edge function's service-role client (see
-- 0016_trusted_devices_rls.sql), mirroring the invites table.

create table public.trusted_devices (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

create index trusted_devices_user_id_idx on public.trusted_devices(user_id);
create index trusted_devices_token_hash_idx on public.trusted_devices(token_hash);
