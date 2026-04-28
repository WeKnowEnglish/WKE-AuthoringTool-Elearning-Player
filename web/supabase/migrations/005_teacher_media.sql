-- Shared teacher media library + public Storage bucket for lesson images

-- Catalog of uploads (teachers only read/write via RLS; students use public URLs only)
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  original_filename text not null,
  content_type text not null,
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index media_assets_created_at_idx on public.media_assets (created_at desc);

alter table public.media_assets enable row level security;

create policy "media_assets_teacher_select"
  on public.media_assets for select
  using (public.is_teacher());

create policy "media_assets_teacher_insert"
  on public.media_assets for insert
  with check (
    public.is_teacher()
    and uploaded_by = auth.uid()
  );

-- Bucket: public read so anonymous students can load images in /learn
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson_media',
  'lesson_media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read objects in this bucket (required for anon lesson player)
create policy "lesson_media_public_read"
  on storage.objects for select
  using (bucket_id = 'lesson_media');

-- Authenticated teachers upload only under their user id folder: "{uid}/..."
create policy "lesson_media_teacher_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lesson_media'
    and public.is_teacher()
    and name like (auth.uid()::text || '/%')
  );

grant select, insert on public.media_assets to authenticated;
