-- Mirrors auth.users.email onto profiles, so the share-by-email feature (and any future
-- one) can resolve "email -> registered user" without needing an edge function to call the
-- Admin API — auth.users itself isn't queryable via the REST API (schema not exposed).
-- Stays covered by the existing profiles_select_own RLS policy (own row or admin only) —
-- this migration does not add any way for a user to browse other users' emails directly;
-- see 0011_learn_script_shares.sql's find_user_by_email(), which returns only an id.

alter table public.profiles add column email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''), new.email);
  return new;
end $$;

-- Keeps profiles.email current if a user ever changes their auth email.
create function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
