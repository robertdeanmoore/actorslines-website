-- Board posts with vote/comment tallies and the caller's own vote, for the
-- board list page.
--
-- Deliberately a security-DEFINER view (security_invoker = off): it joins
-- enhancement_requests, whose rows are private to their authors, but exposes
-- only safe columns (status + the approved public summary). Granted to
-- authenticated users only — anon gets nothing.
create view public.board_posts_with_stats
with (security_invoker = off) as
select
  p.id,
  p.request_id,
  p.summary,
  p.published_at,
  r.status,
  coalesce((select count(*) from public.votes v where v.post_id = p.id and v.value = 1), 0)  as up_votes,
  coalesce((select count(*) from public.votes v where v.post_id = p.id and v.value = -1), 0) as down_votes,
  coalesce((select count(*) from public.comments c where c.post_id = p.id and not c.hidden_by_admin), 0) as comment_count,
  (select v.value from public.votes v where v.post_id = p.id and v.user_id = auth.uid())     as my_vote
from public.board_posts p
join public.enhancement_requests r on r.id = p.request_id;

revoke all on public.board_posts_with_stats from anon, public;
grant select on public.board_posts_with_stats to authenticated;
