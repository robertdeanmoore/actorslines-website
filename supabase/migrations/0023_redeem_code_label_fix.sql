-- RobLife DEF171 / WIP #179: redeeming a valid code fails with Postgres 42702
-- (column reference "label" is ambiguous).
-- redeem_code_tx (0018) returns table (product_code, label, ends_at), so inside the function body
-- "label" is also a PL/pgSQL output variable. Its unqualified "select duration_days, label ...
-- from public.products p" therefore names both the variable and products.label, and PL/pgSQL's
-- default variable_conflict = error rejects it (postgresql.org/docs/current/
-- plpgsql-implementation.html#PLPGSQL-VAR-SUBST). The invalid / expired / exhausted paths raise
-- before that line, so only a successful redemption hits it; the whole call rolls back, so no code
-- use was consumed and no licence written.
-- Fix: qualify the column references with the table alias. Same signature, return shape, guards
-- and writes as 0018; CREATE OR REPLACE keeps the owner and the 0022 grants, restated below.

create or replace function public.redeem_code_tx(p_hash text, p_user uuid)
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

  select p.duration_days, p.label into v_duration_days, v_label
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

-- Unchanged from 0022: service role only (the redeem-code edge function).
revoke execute on function public.redeem_code_tx(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_code_tx(text, uuid) to service_role;
