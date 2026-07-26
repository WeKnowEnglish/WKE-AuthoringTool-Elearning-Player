-- =============================================================================
-- Slice 1: EDU Studio cloud assets (additive — does not alter media_assets)
-- =============================================================================
-- V1 contract (Slice 0):
--   • Table: public.studio_assets — catalog of Studio-uploaded files
--   • Bucket: studio_media (public read) — bytes for LP + Studio
--   • kind: image | audio only
--   • Object path: {uploaded_by}/{asset_id}/{safe_filename}
--   • Writers: authenticated teachers (is_teacher + uploaded_by = auth.uid())
--   • Readers: teachers via RLS; students use public_url (storage public read)
--   • App write path: Studio → LP POST /api/studio/assets → Storage + this table
--   • Pack JSON staging: see 070_studio_activities.sql (Activity Bank)
--   • Out of scope: media_assets merge, student upload
-- =============================================================================

create table if not exists public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  kind text not null
    check (kind in ('image', 'audio')),
  content_type text not null,
  original_filename text not null,
  byte_size bigint not null default 0
    check (byte_size >= 0),
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint studio_assets_original_filename_len
    check (char_length(trim(original_filename)) between 1 and 260),
  constraint studio_assets_content_type_len
    check (char_length(trim(content_type)) between 3 and 120),
  constraint studio_assets_meta_is_object
    check (jsonb_typeof(meta) = 'object')
);

create index if not exists studio_assets_created_at_idx
  on public.studio_assets (created_at desc);

create index if not exists studio_assets_uploaded_by_created_idx
  on public.studio_assets (uploaded_by, created_at desc);

create index if not exists studio_assets_kind_created_idx
  on public.studio_assets (kind, created_at desc);

alter table public.studio_assets enable row level security;

grant select, insert, delete on public.studio_assets to authenticated;

drop policy if exists studio_assets_teacher_select on public.studio_assets;
create policy studio_assets_teacher_select
  on public.studio_assets for select
  to authenticated
  using (public.is_teacher());

drop policy if exists studio_assets_teacher_insert on public.studio_assets;
create policy studio_assets_teacher_insert
  on public.studio_assets for insert
  to authenticated
  with check (
    public.is_teacher()
    and uploaded_by = auth.uid()
  );

drop policy if exists studio_assets_teacher_delete on public.studio_assets;
create policy studio_assets_teacher_delete
  on public.studio_assets for delete
  to authenticated
  using (
    public.is_teacher()
    and uploaded_by = auth.uid()
  );

-- Public bucket so Lesson Player can load assets without a session cookie.
-- 20 MB covers compressed images and short teacher recordings.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio_media',
  'studio_media',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists studio_media_public_read on storage.objects;
create policy studio_media_public_read
  on storage.objects for select
  using (bucket_id = 'studio_media');

drop policy if exists studio_media_teacher_insert on storage.objects;
create policy studio_media_teacher_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'studio_media'
    and public.is_teacher()
    and name like (auth.uid()::text || '/%')
  );

drop policy if exists studio_media_teacher_delete on storage.objects;
create policy studio_media_teacher_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'studio_media'
    and public.is_teacher()
    and owner = auth.uid()
    and name like (auth.uid()::text || '/%')
  );
