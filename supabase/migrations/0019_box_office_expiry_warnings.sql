-- Box Office Phase 4: licence-expiry warning emails (distinct from the existing
-- account-inactivity warnings already in lifecycle/index.ts). See
-- docs/plans/box-office-phase-0.md's roadmap, Phase 4.

alter table public.licences
  add column warned_1mo_at timestamptz,
  add column warned_1wk_at timestamptz;

comment on column public.licences.warned_1mo_at is
  '~1 month before ends_at, once. Skipped for licences whose whole term is under 31 days '
  '(e.g. trial_30d) -- a "renews in a month" notice makes no sense for a 30-day trial.';
comment on column public.licences.warned_1wk_at is
  '~1 week before ends_at, once. Sent for every product, including trials -- everyone deserves '
  'a final nudge before access actually lapses.';
