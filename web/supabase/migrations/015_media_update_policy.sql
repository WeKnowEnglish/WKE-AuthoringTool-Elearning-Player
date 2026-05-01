-- Teachers can update metadata on their own media (media library editor uses UPDATE).
-- Without this policy, RLS blocks updates and PostgREST returns 0 rows → .single() fails.

create policy "media_assets_teacher_update"
  on public.media_assets
  for update
  using (
    public.is_teacher()
    and uploaded_by = auth.uid()
  )
  with check (
    public.is_teacher()
    and uploaded_by = auth.uid()
  );

grant update on public.media_assets to authenticated;
