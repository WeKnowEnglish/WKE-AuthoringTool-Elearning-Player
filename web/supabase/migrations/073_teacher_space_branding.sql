-- =============================================================================
-- My Classroom branding (hero + theme + activity covers)
-- =============================================================================

alter table public.teacher_spaces
  add column if not exists hero_image_url text;

alter table public.teacher_spaces
  add column if not exists hero_asset_id uuid;

alter table public.teacher_spaces
  add column if not exists theme_id text not null default 'sky_day';

alter table public.teacher_spaces
  drop constraint if exists teacher_spaces_theme_id_check;

alter table public.teacher_spaces
  add constraint teacher_spaces_theme_id_check
  check (theme_id in ('sky_day', 'leaf_garden', 'coral_studio', 'ink_slate'));

alter table public.teacher_spaces
  drop constraint if exists teacher_spaces_hero_url_https;

alter table public.teacher_spaces
  add constraint teacher_spaces_hero_url_https
  check (
    hero_image_url is null
    or hero_image_url ~* '^https://'
  );

alter table public.teacher_space_items
  add column if not exists cover_image_url text;

alter table public.teacher_space_items
  drop constraint if exists teacher_space_items_cover_url_https;

alter table public.teacher_space_items
  add constraint teacher_space_items_cover_url_https
  check (
    cover_image_url is null
    or cover_image_url ~* '^https://'
  );

comment on column public.teacher_spaces.hero_image_url is
  'Optional full-bleed classroom hero (public https URL from studio_media).';

comment on column public.teacher_spaces.theme_id is
  'Named classroom theme preset: sky_day | leaf_garden | coral_studio | ink_slate.';

comment on column public.teacher_space_items.cover_image_url is
  'Optional activity tile cover; usually first https image in frozen pack.';
