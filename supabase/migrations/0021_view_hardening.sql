-- View privileges (RobLife WIP #160 row 28, Holly view ruling item 3).
--
-- Supabase's default privileges give anon and authenticated every privilege on each
-- new public relation. The views below were created with only a select grant, so they
-- also carried every write privilege (live check 2026-10-06), and public_profiles also
-- read access for anon. public_profiles is a simple, auto-updatable security-definer
-- view, so a write through it runs as the view owner and skips profiles RLS: anyone
-- holding the public anon key could rename or delete any profile (delete cascades to
-- the user's content). Each view now carries exactly the privilege its pages need.

-- ── security-definer by design (reason recorded), SELECT for signed-in users only ──
-- public_profiles: display names for comment authors and script sharers; profiles RLS
-- is own-row only, so an invoker view would show other users as "Former member".
revoke all on public.public_profiles from anon, authenticated, public;
grant select on public.public_profiles to authenticated;

-- board_posts_with_stats: exposes only status + the approved summary of requests whose
-- rows are private to their authors (see 0004). Not updatable; anon already revoked.
revoke all on public.board_posts_with_stats from anon, authenticated, public;
grant select on public.board_posts_with_stats to authenticated;

-- ── telemetry aggregates: invoker rights ──
-- Every row is already gated on public.is_admin(), and telemetry_events has an
-- admin-only select policy, so running as the caller returns the same rows (all for
-- admins, none for anyone else) without owner rights.
alter view public.telemetry_event_counts set (security_invoker = true);
alter view public.telemetry_value_counts set (security_invoker = true);
alter view public.telemetry_session_stats set (security_invoker = true);

revoke all on public.telemetry_event_counts from anon, authenticated, public;
revoke all on public.telemetry_value_counts from anon, authenticated, public;
revoke all on public.telemetry_session_stats from anon, authenticated, public;
grant select on public.telemetry_event_counts to authenticated;
grant select on public.telemetry_value_counts to authenticated;
grant select on public.telemetry_session_stats to authenticated;
