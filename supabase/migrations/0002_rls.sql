-- Row-level security: users see their own things; published board is readable
-- by all registered users; admin sees and edits everything.

alter table public.profiles enable row level security;
alter table public.enhancement_requests enable row level security;
alter table public.request_messages enable row level security;
alter table public.ai_reports enable row level security;
alter table public.board_posts enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.dev_notes enable row level security;
alter table public.plans enable row level security;

-- profiles: read own; update own display_name only; admin reads all.
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'user' or public.is_admin());

-- Display names shown on comments come via a safe view, not the table.
create view public.public_profiles with (security_invoker = off) as
  select id, display_name from public.profiles;
grant select on public.public_profiles to authenticated;

-- enhancement_requests: authors CRUD their own while not yet published; admin all.
create policy "requests_select" on public.enhancement_requests
  for select using (author_id = auth.uid() or public.is_admin());
create policy "requests_insert" on public.enhancement_requests
  for insert with check (author_id = auth.uid());
create policy "requests_update_admin" on public.enhancement_requests
  for update using (public.is_admin());
create policy "requests_delete_admin" on public.enhancement_requests
  for delete using (public.is_admin());

-- request_messages: participants of the request + admin.
create policy "messages_select" on public.request_messages
  for select using (
    public.is_admin() or exists (
      select 1 from public.enhancement_requests r
      where r.id = request_id and r.author_id = auth.uid()));
create policy "messages_insert" on public.request_messages
  for insert with check (
    (author_kind = 'user' and author_id = auth.uid() and exists (
      select 1 from public.enhancement_requests r
      where r.id = request_id and r.author_id = auth.uid()))
    or (author_kind = 'admin' and public.is_admin()));

-- ai_reports / dev_notes / plans: admin only (Actions write via service role,
-- which bypasses RLS).
create policy "reports_admin" on public.ai_reports
  for all using (public.is_admin());
create policy "dev_notes_admin" on public.dev_notes
  for all using (public.is_admin());
create policy "plans_admin" on public.plans
  for all using (public.is_admin());

-- board_posts: all registered users read; only admin writes.
create policy "posts_select" on public.board_posts
  for select using (auth.uid() is not null);
create policy "posts_admin_write" on public.board_posts
  for insert with check (public.is_admin());
create policy "posts_admin_update" on public.board_posts
  for update using (public.is_admin());
create policy "posts_admin_delete" on public.board_posts
  for delete using (public.is_admin());

-- votes: one per user per post; users manage their own vote.
create policy "votes_select" on public.votes
  for select using (auth.uid() is not null);
create policy "votes_upsert_own" on public.votes
  for insert with check (user_id = auth.uid());
create policy "votes_update_own" on public.votes
  for update using (user_id = auth.uid());
create policy "votes_delete_own" on public.votes
  for delete using (user_id = auth.uid());

-- comments: registered users read non-hidden (admin reads all); authors insert;
-- admin hides/deletes.
create policy "comments_select" on public.comments
  for select using (auth.uid() is not null and (not hidden_by_admin or public.is_admin()));
create policy "comments_insert_own" on public.comments
  for insert with check (author_id = auth.uid());
create policy "comments_admin_update" on public.comments
  for update using (public.is_admin());
create policy "comments_admin_delete" on public.comments
  for delete using (public.is_admin());
