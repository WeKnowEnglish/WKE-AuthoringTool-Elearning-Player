-- Add editable display/item name for media assets

alter table public.media_assets
  add column if not exists meta_item_name text;

create index if not exists media_assets_meta_item_name_idx
  on public.media_assets (meta_item_name);
