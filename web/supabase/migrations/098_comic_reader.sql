-- WKE comic reader: published chapters with ordered page images (public read).

create table public.comic_chapters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comic_pages (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.comic_chapters (id) on delete cascade,
  page_index integer not null check (page_index >= 1),
  storage_path text not null unique,
  public_url text not null,
  original_filename text not null,
  content_type text not null,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (chapter_id, page_index)
);

create index comic_pages_chapter_index_idx
  on public.comic_pages (chapter_id, page_index);

alter table public.comic_chapters enable row level security;
alter table public.comic_pages enable row level security;

-- Anyone can read published comics (students / anon on /wke/comic).
create policy "comic_chapters_public_select"
  on public.comic_chapters for select
  using (published = true);

create policy "comic_pages_public_select"
  on public.comic_pages for select
  using (
    exists (
      select 1
      from public.comic_chapters c
      where c.id = chapter_id
        and c.published = true
    )
  );

grant select on public.comic_chapters to anon, authenticated;
grant select on public.comic_pages to anon, authenticated;

-- Writes go through the service role from admin server actions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comic_media',
  'comic_media',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "comic_media_public_read"
  on storage.objects for select
  using (bucket_id = 'comic_media');

insert into public.comic_chapters (slug, title, subtitle, published)
values (
  'chapter-1',
  'Chapter 1',
  'We Know English comic',
  true
)
on conflict (slug) do nothing;
