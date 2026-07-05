-- Self-service account deletion (promised in the privacy policy).
-- Deleting the auth.users row cascades to profiles and all owned content.
create function public.delete_own_account()
returns void language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
