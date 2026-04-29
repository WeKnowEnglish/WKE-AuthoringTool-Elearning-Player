-- Media library metadata + dedupe support

alter table public.media_assets
  add column if not exists sha256_hash text,
  add column if not exists phash text,
  add column if not exists meta_categories text[] not null default '{}',
  add column if not exists meta_tags text[] not null default '{}',
  add column if not exists meta_alternative_names text[] not null default '{}',
  add column if not exists meta_plural text,
  add column if not exists meta_countability text not null default 'na',
  add column if not exists meta_level text,
  add column if not exists meta_word_type text,
  add column if not exists meta_skills text[] not null default '{}',
  add column if not exists meta_past_tense text,
  add column if not exists meta_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_assets_meta_countability_check'
  ) then
    alter table public.media_assets
      add constraint media_assets_meta_countability_check
      check (meta_countability in ('countable', 'uncountable', 'both', 'na'));
  end if;
end $$;

create unique index if not exists media_assets_image_sha256_unique_idx
  on public.media_assets (sha256_hash)
  where content_type like 'image/%' and sha256_hash is not null;

create index if not exists media_assets_phash_idx
  on public.media_assets (phash)
  where phash is not null;

create index if not exists media_assets_meta_tags_gin_idx
  on public.media_assets using gin (meta_tags);

create index if not exists media_assets_meta_categories_gin_idx
  on public.media_assets using gin (meta_categories);

create index if not exists media_assets_meta_skills_gin_idx
  on public.media_assets using gin (meta_skills);

create index if not exists media_assets_meta_alt_names_gin_idx
  on public.media_assets using gin (meta_alternative_names);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson_media',
  'lesson_media',
  true,
  10485760,
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
