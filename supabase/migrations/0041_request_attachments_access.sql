-- WIP #269 P4 slice 4.1b: access control and private storage bucket for request attachments.
-- NOT YET APPLIED. Gated step: Holly review (bucket, RLS, storage policy) + Robert sign-off, then the
-- gated migration runner (Skills/applying-supabase-migration). Needs 0040 (public.request_attachments).
--
-- Model:
--   * public.request_attachments: admin read only. Nobody else has any table grant; rows are written
--     only by the `submit-request-app` edge function with the service role.
--   * Storage bucket `request-attachments`: PRIVATE (public = false), no listing, no public read.
--     Files are uploaded to signed upload URLs that the edge function creates with the service role
--     (the Storage API checks the signed token, not a row policy), so no insert/update/delete policy
--     exists on storage.objects for anon or authenticated: default deny.
--   * Read: only an admin (public.is_admin()), through a short-lived signed URL (5 minutes) fetched by
--     the admin page. An owner reading their own file is deliberately NOT allowed in v1.
--   * Bucket-level limits are a second line of defence; the edge function enforces the real per-kind
--     caps (image 5 MB, audio 3 MB) and checks the file's magic bytes against its declared type.
-- Idempotent: safe to run twice.

alter table public.request_attachments enable row level security;

revoke all on public.request_attachments from public, anon, authenticated;
grant select on public.request_attachments to authenticated;        -- the policy below limits it to admins

drop policy if exists request_attachments_admin_read on public.request_attachments;
create policy request_attachments_admin_read on public.request_attachments
  for select to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-attachments', 'request-attachments', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/mpeg']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists request_attachments_admin_read on storage.objects;
create policy request_attachments_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'request-attachments' and public.is_admin());

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'request-attachments' and public = false) then
    raise exception '0041 post-condition: bucket request-attachments missing or public - aborted';
  end if;
  if has_table_privilege('anon', 'public.request_attachments', 'select')
     or has_table_privilege('anon', 'public.request_attachments', 'insert')
     or has_table_privilege('authenticated', 'public.request_attachments', 'insert')
     or has_table_privilege('authenticated', 'public.request_attachments', 'update')
     or has_table_privilege('authenticated', 'public.request_attachments', 'delete') then
    raise exception '0041 post-condition: request_attachments grants wrong - aborted';
  end if;
end $$;
