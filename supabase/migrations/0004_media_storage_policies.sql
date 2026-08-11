-- ---------------------------------------------------------------------------
-- Admin image upload: allow staff (admin/editor) to manage objects in the
-- public 'media' bucket. The bucket itself was created in 0001_schema.sql.
-- Bucket is public so objects remain readable via their public URL.
-- ---------------------------------------------------------------------------
create policy "media_objects_staff_insert" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'media' and public.is_staff() );

create policy "media_objects_staff_select" on storage.objects
  for select to authenticated
  using ( bucket_id = 'media' and public.is_staff() );

create policy "media_objects_staff_update" on storage.objects
  for update to authenticated
  using ( bucket_id = 'media' and public.is_staff() )
  with check ( bucket_id = 'media' and public.is_staff() );

create policy "media_objects_staff_delete" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'media' and public.is_staff() );
