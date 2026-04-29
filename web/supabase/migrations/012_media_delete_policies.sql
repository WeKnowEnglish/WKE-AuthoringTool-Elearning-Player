-- Allow teachers to delete their own media assets and files

create policy "media_assets_teacher_delete"
  on public.media_assets
  for delete
  using (
    public.is_teacher()
    and uploaded_by = auth.uid()
  );

create policy "lesson_media_teacher_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'lesson_media'
    and public.is_teacher()
    and owner = auth.uid()
    and name like (auth.uid()::text || '/%')
  );

grant delete on public.media_assets to authenticated;
