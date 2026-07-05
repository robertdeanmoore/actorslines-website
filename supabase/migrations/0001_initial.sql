-- Actors Lines website: initial schema.
-- Applied with `supabase db push` (see SETUP.md).

create type public.request_status as enum (
  'submitted',        -- form received, AI triage not yet run/complete
  'reported',         -- AI report ready, awaiting Rob's review
  'published',        -- summary approved and visible on the public board
  'planned',          -- at least one approved implementation plan exists
  'implemented',      -- PR merged / shipped
  'closed',           -- Rob closed it (won't do)
  'rejected',         -- abuse / nonsense
  'abandoned'         -- reserved for the deferred refinement-nag flow
);

create type public.app_role as enum ('user', 'admin');

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  inactivity_warned_1_at timestamptz,
  inactivity_warned_2_at timestamptz
);

-- Auto-create a profile row on signup.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Called by the SPA on load; also clears pending inactivity warnings.
create function public.touch_last_seen()
returns void language sql security definer set search_path = public as $$
  update public.profiles
  set last_seen_at = now(), inactivity_warned_1_at = null, inactivity_warned_2_at = null
  where id = auth.uid();
$$;

-- Admin check used by RLS policies (security definer avoids recursive RLS).
create function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ── enhancement requests ────────────────────────────────────────────────────
create table public.enhancement_requests (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  status public.request_status not null default 'submitted',
  title text not null check (char_length(title) between 5 and 80),
  goal text not null check (char_length(goal) >= 30),            -- what are you trying to achieve
  where_in_app text not null check (char_length(where_in_app) >= 10),
  how_it_works text not null check (char_length(how_it_works) >= 30),
  usage_frequency text not null default '',                       -- how often would you use it
  extra_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── message thread per request (backbone for deferred AI-refinement loop) ──
create table public.request_messages (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.enhancement_requests(id) on delete cascade,
  author_kind text not null check (author_kind in ('user', 'admin', 'system')),
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- ── AI developer reports (admin-only) ───────────────────────────────────────
create table public.ai_reports (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.enhancement_requests(id) on delete cascade,
  report_md text not null,            -- full markdown report from the Action
  summary_draft text not null,        -- AI-drafted public board summary
  created_at timestamptz not null default now()
);

-- ── public board ────────────────────────────────────────────────────────────
create table public.board_posts (
  id bigint generated always as identity primary key,
  request_id bigint not null unique references public.enhancement_requests(id) on delete cascade,
  summary text not null,              -- locked; only admin can edit
  published_at timestamptz not null default now()
);

create table public.votes (
  post_id bigint not null references public.board_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.board_posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  hidden_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── developer workflow (admin-only) ─────────────────────────────────────────
create table public.dev_notes (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.enhancement_requests(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.plans (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.enhancement_requests(id) on delete cascade,
  iteration int not null default 1,
  prompt text not null,               -- Rob's prompt for this iteration
  repo_path text,                     -- docs/plans/requests/<id>-vN.md once committed
  status text not null default 'requested'
    check (status in ('requested', 'draft', 'approved', 'implemented', 'failed')),
  pr_url text,
  created_at timestamptz not null default now()
);
