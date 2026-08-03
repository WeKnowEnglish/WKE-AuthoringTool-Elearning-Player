-- Editable comic lettering and interaction metadata.
-- Artwork stays in Storage; balloons, captions, reading order, vocabulary, and prompts live here.

alter table public.comic_pages
  add column if not exists image_width integer check (image_width is null or image_width > 0),
  add column if not exists image_height integer check (image_height is null or image_height > 0),
  add column if not exists overlay_data jsonb,
  add column if not exists overlay_updated_at timestamptz;

comment on column public.comic_pages.overlay_data is
  'Versioned editable lettering/interaction document. Bounds use percentages so placement survives responsive scaling.';

create index if not exists comic_pages_overlay_version_idx
  on public.comic_pages (((overlay_data ->> 'version')::integer))
  where overlay_data is not null;
