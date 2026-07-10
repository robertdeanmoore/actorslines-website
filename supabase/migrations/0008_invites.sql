-- Invite-only registration: admin generates a single-use token, emails it, the
-- recipient uses it once to create their own (non-admin) account.

create table public.invites (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) between 3 and 200),
  token text not null unique,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null
);

create index invites_token_idx on public.invites(token);
create index invites_email_idx on public.invites(lower(email));
