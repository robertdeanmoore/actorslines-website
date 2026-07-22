-- Box Office Phase 1: server-side licences, admin grant/revoke, trial issuance, redeem codes.
-- See the ActorsVoice repo: docs/monetization/rules.md, entitlement-architecture.md,
-- tier-capability-matrix.md, docs/plans/box-office-phase-1.md.
--
-- Renumbered 22 Jul 2026: this was going to be 0017, but 0017 shipped as telemetry on 21 Jul
-- before this phase started -- see docs/monetization/entitlement-architecture.md.
--
-- Capabilities are the exact Entitlements shape from the app repo's data/entitlement/Entitlements.kt:
-- canImportScripts, canRunScenes, canUseTts, canUseSelftape, canExportCast, canCreatePlays,
-- maxActivePlays (int or json null = unlimited). tierLabel/licenceEndsAtEpochMs are NOT stored per
-- product -- they're computed at token-issue time from the winning licence's product label/rank
-- and ends_at.

-- gen_random_bytes/digest (admin_create_redemption_code's code minting) need pgcrypto; idempotent
-- if the project already has it, which most Supabase projects do by default.
create extension if not exists pgcrypto;

-- ── product catalogue ─────────────────────────────────────────────────────────
create table public.products (
  code text primary key,
  label text not null,
  rank smallint not null default 0,
  duration_days int,                    -- null = end-dated per grant, not a fixed term
  price_pence int not null default 0,
  capabilities jsonb not null,
  active boolean not null default true  -- false = grant-only or not yet sold (groups, Phase 7)
);

comment on table public.products is
  'The single server-side tier -> capability mapping. docs/monetization/tier-capability-matrix.md '
  'is its human-readable mirror -- if they disagree, this table is authoritative and the doc is the bug.';

-- ── licences ───────────────────────────────────────────────────────────────────
create table public.licences (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null references public.products(code),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,         -- golden principle #1: every licence row has a real end
  source text not null check (source in ('trial', 'purchase', 'admin', 'group', 'reward', 'play_billing')),
  status text not null default 'active' check (status in ('active', 'revoked', 'refunded')),
  price_paid_pence int,
  order_ref text,
  revoked_at timestamptz,
  revoked_reason text,
  check (ends_at > starts_at)
);

create index licences_user_idx on public.licences(user_id);
create index licences_active_idx on public.licences(user_id, status, ends_at);

-- One trial per user, ever -- blocks even a revoked trial from being re-granted, since the whole
-- point is a one-time no-card trial, not a resettable one.
create unique index licences_one_trial_per_user on public.licences(user_id) where product_code = 'trial_30d';

-- ── redemption codes ─────────────────────────────────────────────────────────────
create table public.redemption_codes (
  id bigint generated always as identity primary key,
  code_hash text not null unique,       -- sha256 of the normalised code; plaintext shown once at mint
  code_hint text not null,              -- last 4 chars, cleartext, for support lookups
  product_code text not null references public.products(code),
  expires_at timestamptz,
  max_uses int not null default 1,
  redeemed_count int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index redemption_codes_hash_idx on public.redemption_codes(code_hash);

-- ── audit trail (append-only) ───────────────────────────────────────────────────
create table public.licence_audit (
  id bigint generated always as identity primary key,
  licence_id bigint references public.licences(id) on delete set null, -- nullable: redeem_failed rows have none
  actor uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('granted', 'revoked', 'updated', 'redeemed', 'redeem_failed')),
  via text,                             -- e.g. 'admin_grant', 'redeem_code', 'trial_trigger'
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index licence_audit_licence_idx on public.licence_audit(licence_id);
create index licence_audit_actor_time_idx on public.licence_audit(actor, created_at desc);

-- ── audit trigger: every write to licences is logged; DELETE is refused outright ──
-- Reason/note flow in via transaction-local set_config('app.audit_note', …) /
-- set_config('app.audit_via', …) from the calling RPC; falls back to auth.uid() for the actor
-- when no explicit app.audit_actor is set (e.g. a user's own redeem call).
create function public.audit_licence_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
  v_via text;
  v_note text;
  v_action text;
begin
  if tg_op = 'DELETE' then
    raise exception 'licences rows are never deleted -- revoke instead (golden principle #1, rules.md)';
  end if;

  v_actor := coalesce(nullif(current_setting('app.audit_actor', true), '')::uuid, auth.uid());
  v_via := nullif(current_setting('app.audit_via', true), '');
  v_note := nullif(current_setting('app.audit_note', true), '');

  if tg_op = 'INSERT' then
    v_action := 'granted';
  elsif new.status = 'revoked' and old.status is distinct from 'revoked' then
    v_action := 'revoked';
  else
    v_action := 'updated';
  end if;

  insert into public.licence_audit (licence_id, actor, action, via, details)
  values (
    new.id, v_actor, v_action, v_via,
    jsonb_strip_nulls(jsonb_build_object(
      'note', v_note, 'product_code', new.product_code, 'status', new.status
    ))
  );
  return new;
end $$;

create trigger trg_licences_audit_write
  after insert or update on public.licences
  for each row execute function public.audit_licence_change();

create trigger trg_licences_audit_delete
  before delete on public.licences
  for each row execute function public.audit_licence_change();

-- ── effective entitlements: capability-wise union of every active, in-date licence ──
-- Group and individual licences compose naturally under this rule with zero special-casing once
-- groups (Phase 7) arrive -- a group licence is just another row in this same table.
create function public.effective_entitlements(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'canImportScripts', coalesce(bool_or((p.capabilities ->> 'canImportScripts')::boolean), false),
    'canRunScenes',     coalesce(bool_or((p.capabilities ->> 'canRunScenes')::boolean), false),
    'canUseTts',        coalesce(bool_or((p.capabilities ->> 'canUseTts')::boolean), false),
    'canUseSelftape',   coalesce(bool_or((p.capabilities ->> 'canUseSelftape')::boolean), false),
    'canExportCast',    coalesce(bool_or((p.capabilities ->> 'canExportCast')::boolean), false),
    -- Free (no active licence at all) can still create plays -- canCreatePlays true is the floor,
    -- not something only a paid licence grants.
    'canCreatePlays',   coalesce(bool_or((p.capabilities ->> 'canCreatePlays')::boolean), true),
    -- null (unlimited) beats any finite number -- the union is "most generous held", and
    -- unlimited is the most generous value maxActivePlays can take.
    'maxActivePlays',   case
                          when bool_or(p.capabilities -> 'maxActivePlays' = 'null'::jsonb) then null
                          else coalesce(max((p.capabilities ->> 'maxActivePlays')::int), 1)
                        end
  )
  from public.licences l
  join public.products p on p.code = l.product_code
  where l.user_id = p_user and l.status = 'active' and l.ends_at > now();
$$;

-- ── entitlements_for: effective_entitlements() + the display-only tierLabel/licenceEndsAtEpochMs ──
-- tierLabel is taken from the highest-`rank` contributing product (ties -> latest ends_at), per
-- tier-capability-matrix.md. Returns a single row shaped exactly like the app's Entitlements DTO
-- (as milliseconds for licenceEndsAtEpochMs, matching the Kotlin Long field) plus the raw
-- ents jsonb the entitlement-token function embeds verbatim as the `ent` claim.
create function public.entitlements_for(p_user uuid)
returns table (ent jsonb, tier_label text, licence_ends_at_epoch_ms bigint) language sql stable
security definer set search_path = public as $$
  with winner as (
    select p.label, l.ends_at
    from public.licences l
    join public.products p on p.code = l.product_code
    where l.user_id = p_user and l.status = 'active' and l.ends_at > now()
    order by p.rank desc, l.ends_at desc
    limit 1
  )
  select
    public.effective_entitlements(p_user),
    coalesce((select label from winner), 'Free'),
    (select (extract(epoch from ends_at) * 1000)::bigint from winner);
$$;

-- ── trial auto-grant on email confirmation ──────────────────────────────────────
-- Fires for both self-serve signup (currently disabled) and the invite-accept path, since
-- invite/index.ts's admin.auth.admin.createUser() sets email_confirm: true at INSERT time, not
-- via a later UPDATE -- so this must fire on INSERT too, not only on UPDATE of email_confirmed_at.
create function public.grant_trial_on_confirm()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new; -- already handled
  end if;

  perform set_config('app.audit_via', 'trial_trigger', true);
  insert into public.licences (user_id, product_code, starts_at, ends_at, source, status)
  values (new.id, 'trial_30d', now(), now() + interval '30 days', 'trial', 'active')
  on conflict do nothing; -- the one-trial-per-user partial unique index makes this idempotent
  return new;
end $$;

create trigger on_auth_user_email_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.grant_trial_on_confirm();

-- ── admin RPCs (SECURITY DEFINER; is_admin() gate; the only way licences get written) ──
create function public.admin_grant_licence(
  p_user uuid, p_product text, p_starts timestamptz, p_ends timestamptz, p_note text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if p_ends <= p_starts or p_ends <= now() then
    raise exception 'ends must be after starts and in the future';
  end if;

  perform set_config('app.audit_actor', auth.uid()::text, true);
  perform set_config('app.audit_via', 'admin_grant', true);
  perform set_config('app.audit_note', coalesce(p_note, ''), true);

  insert into public.licences (user_id, product_code, starts_at, ends_at, source, status)
  values (p_user, p_product, p_starts, p_ends, 'admin', 'active')
  returning id into v_id;

  return v_id;
end $$;

create function public.admin_revoke_licence(p_licence_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if char_length(coalesce(p_reason, '')) < 3 then
    raise exception 'a revoke reason of at least 3 characters is required';
  end if;

  select status into v_status from public.licences where id = p_licence_id;
  if v_status is null then
    raise exception 'licence not found';
  end if;
  if v_status = 'revoked' then
    raise exception 'already revoked -- grant a fresh licence instead of un-revoking';
  end if;

  perform set_config('app.audit_actor', auth.uid()::text, true);
  perform set_config('app.audit_via', 'admin_revoke', true);
  perform set_config('app.audit_note', p_reason, true);

  update public.licences
  set status = 'revoked', revoked_at = now(), revoked_reason = p_reason
  where id = p_licence_id;
end $$;

-- Crockford base32 (no ambiguous glyphs: no I, L, O, U), format AL-XXXX-XXXX.
create function public.admin_create_redemption_code(
  p_product text, p_expires timestamptz default null, p_max_uses int default 1
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; -- Crockford32, ambiguous glyphs removed
  v_plain text := '';
  v_bytes bytea;
  v_i int;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  v_bytes := gen_random_bytes(8);
  for v_i in 0..7 loop
    v_plain := v_plain || substr(v_alphabet, (get_byte(v_bytes, v_i) % 32) + 1, 1);
  end loop;
  v_plain := 'AL-' || substr(v_plain, 1, 4) || '-' || substr(v_plain, 5, 4);

  insert into public.redemption_codes (code_hash, code_hint, product_code, expires_at, max_uses, created_by)
  values (
    encode(digest(v_plain, 'sha256'), 'hex'),
    right(v_plain, 4),
    p_product, p_expires, p_max_uses, auth.uid()
  );

  return v_plain; -- plaintext returned exactly once -- only code_hash/code_hint are ever stored
end $$;

-- ilike search on email/display_name via the auth.users join -- emails aren't otherwise
-- client-readable, so this is the only way the admin UI can find a user to grant/revoke for.
create function public.admin_search_users(p_query text)
returns table (id uuid, email text, display_name text, role public.app_role)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return query
    select pr.id, u.email::text, pr.display_name, pr.role
    from public.profiles pr
    join auth.users u on u.id = pr.id
    where u.email ilike '%' || p_query || '%' or pr.display_name ilike '%' || p_query || '%'
    order by pr.created_at desc
    limit 20;
end $$;

-- ── redeem_code_tx: the actual sales mechanism under Codes-first ───────────────
-- Reuses invite/index.ts's proven guard shape (a single atomic UPDATE whose WHERE clause can
-- affect at most one row) rather than SELECT ... FOR UPDATE -- same guarantee, one round trip,
-- already battle-tested in this codebase. service-role-only: called from the redeem-code edge
-- function with the caller's user id, never directly from the browser.
create function public.redeem_code_tx(p_hash text, p_user uuid)
returns table (product_code text, label text, ends_at timestamptz) language plpgsql
security definer set search_path = public as $$
declare
  v_code record;
  v_duration_days int;
  v_duration interval;
  v_ends timestamptz;
  v_label text;
begin
  select * into v_code from public.redemption_codes where code_hash = p_hash;

  if v_code.id is null then
    insert into public.licence_audit (actor, action, via, details)
    values (p_user, 'redeem_failed', 'redeem_code', jsonb_build_object('reason', 'invalid'));
    raise exception 'code_invalid';
  end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    insert into public.licence_audit (actor, action, via, details)
    values (p_user, 'redeem_failed', 'redeem_code', jsonb_build_object('reason', 'expired'));
    raise exception 'code_expired';
  end if;

  -- Atomic claim: at most one concurrent redeemer can win this UPDATE per available use.
  update public.redemption_codes
  set redeemed_count = redeemed_count + 1
  where code_hash = p_hash and redeemed_count < max_uses;
  if not found then
    insert into public.licence_audit (actor, action, via, details)
    values (p_user, 'redeem_failed', 'redeem_code', jsonb_build_object('reason', 'exhausted'));
    raise exception 'code_exhausted';
  end if;

  select duration_days, label into v_duration_days, v_label
  from public.products p where p.code = v_code.product_code;
  v_duration := coalesce(v_duration_days, 180) * interval '1 day';
  v_ends := now() + v_duration;

  perform set_config('app.audit_actor', p_user::text, true);
  perform set_config('app.audit_via', 'redeem_code', true);
  perform set_config('app.audit_note', 'code_hint:' || v_code.code_hint, true);

  insert into public.licences (user_id, product_code, starts_at, ends_at, source, status, order_ref)
  values (p_user, v_code.product_code, now(), v_ends, 'reward', 'active', 'redeem:' || v_code.code_hint || ':' || left(p_hash, 8));

  return query select v_code.product_code, v_label, v_ends;
end $$;

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.products enable row level security;
alter table public.licences enable row level security;
alter table public.redemption_codes enable row level security;
alter table public.licence_audit enable row level security;

create policy "products_read_active_or_admin" on public.products
  for select using (active or public.is_admin());

create policy "licences_own_or_admin" on public.licences
  for select using (user_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies at all -- every write goes through the SECURITY DEFINER
-- RPCs above, which run as the function owner and so bypass RLS entirely by design.

create policy "licence_audit_admin_only" on public.licence_audit
  for select using (public.is_admin());

create policy "redemption_codes_admin_only" on public.redemption_codes
  for select using (public.is_admin());

-- ── seed the product catalogue ───────────────────────────────────────────────────
-- Capabilities come from docs/monetization/tier-capability-matrix.md -- that table is the
-- source, this is a copy. Idempotent upsert so re-running this migration (or a future correction
-- migration) never duplicates rows.
insert into public.products (code, label, rank, duration_days, price_pence, capabilities, active) values
  ('free', 'Free', 0, null, 0,
    '{"canImportScripts":false,"canRunScenes":false,"canUseTts":false,"canUseSelftape":false,"canExportCast":false,"canCreatePlays":true,"maxActivePlays":1}'::jsonb,
    true),
  ('group_member', 'Group member', 10, 180, 300,
    '{"canImportScripts":true,"canRunScenes":true,"canUseTts":true,"canUseSelftape":true,"canExportCast":false,"canCreatePlays":false,"maxActivePlays":1}'::jsonb,
    false), -- inert until Phase 7; grantable by hand regardless, per the groups decision
  ('single_play_6mo', 'Single Play', 20, 180, 500,
    '{"canImportScripts":true,"canRunScenes":true,"canUseTts":true,"canUseSelftape":true,"canExportCast":false,"canCreatePlays":true,"maxActivePlays":1}'::jsonb,
    true),
  ('trial_30d', 'Trial', 30, 30, 0,
    '{"canImportScripts":true,"canRunScenes":true,"canUseTts":true,"canUseSelftape":true,"canExportCast":false,"canCreatePlays":true,"maxActivePlays":null}'::jsonb,
    true),
  ('unlimited_6mo', 'Unlimited', 40, 180, 700,
    '{"canImportScripts":true,"canRunScenes":true,"canUseTts":true,"canUseSelftape":true,"canExportCast":true,"canCreatePlays":true,"maxActivePlays":null}'::jsonb,
    true),
  ('group_master', 'Group master', 50, 180, 1000,
    '{"canImportScripts":true,"canRunScenes":true,"canUseTts":true,"canUseSelftape":true,"canExportCast":true,"canCreatePlays":true,"maxActivePlays":null}'::jsonb,
    false), -- inert until Phase 7
  ('comp_rolling', 'Complimentary', 55, null, 0,
    '{"canImportScripts":true,"canRunScenes":true,"canUseTts":true,"canUseSelftape":true,"canExportCast":true,"canCreatePlays":true,"maxActivePlays":null}'::jsonb,
    false), -- grant-only; nightly-extended by the lifecycle cron, never listed for sale
  ('admin_full', 'Admin', 60, null, 0,
    '{"canImportScripts":true,"canRunScenes":true,"canUseTts":true,"canUseSelftape":true,"canExportCast":true,"canCreatePlays":true,"maxActivePlays":null}'::jsonb,
    false) -- grant-only preset (incl. the show-week emergency grant), never listed for sale
on conflict (code) do update set
  label = excluded.label, rank = excluded.rank, duration_days = excluded.duration_days,
  price_pence = excluded.price_pence, capabilities = excluded.capabilities, active = excluded.active;
