-- =============================================================================
-- Additive: content hash for studio_assets dedupe (same teacher, same bytes)
-- =============================================================================
-- Allows POST /api/studio/assets to reuse an existing public_url when the
-- teacher re-uploads identical image/audio (e.g. Activity Bank preflight).
-- =============================================================================

alter table public.studio_assets
  add column if not exists content_sha256 text;

alter table public.studio_assets
  drop constraint if exists studio_assets_content_sha256_len;

alter table public.studio_assets
  add constraint studio_assets_content_sha256_len
  check (
    content_sha256 is null
    or char_length(content_sha256) = 64
  );

create unique index if not exists studio_assets_uploaded_by_sha256_uidx
  on public.studio_assets (uploaded_by, content_sha256)
  where content_sha256 is not null;

comment on column public.studio_assets.content_sha256 is
  'Lowercase hex SHA-256 of file bytes; unique per teacher for dedupe.';
