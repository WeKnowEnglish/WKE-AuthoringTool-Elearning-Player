-- Compact Classroom Wall customization: profile identity, named sections,
-- and a restrained card/compact activity layout.
alter table public.teacher_spaces
  add column if not exists profile_image_url text,
  add column if not exists profile_asset_id uuid,
  add column if not exists activity_layout text not null default 'cards',
  add column if not exists wall_sections jsonb not null
    default '[{"id":"activities","label":"Activities"}]'::jsonb;

alter table public.teacher_space_items
  add column if not exists section_id text not null default 'activities';

alter table public.teacher_spaces drop constraint if exists teacher_spaces_profile_url_https;
alter table public.teacher_spaces add constraint teacher_spaces_profile_url_https
  check (profile_image_url is null or profile_image_url ~* '^https://');
alter table public.teacher_spaces drop constraint if exists teacher_spaces_activity_layout_check;
alter table public.teacher_spaces add constraint teacher_spaces_activity_layout_check
  check (activity_layout in ('cards', 'compact'));
alter table public.teacher_spaces drop constraint if exists teacher_spaces_wall_sections_check;
alter table public.teacher_spaces add constraint teacher_spaces_wall_sections_check
  check (jsonb_typeof(wall_sections) = 'array' and jsonb_array_length(wall_sections) between 1 and 8);
alter table public.teacher_space_items drop constraint if exists teacher_space_items_section_id_len;
alter table public.teacher_space_items add constraint teacher_space_items_section_id_len
  check (char_length(section_id) between 1 and 48);
create index if not exists teacher_space_items_space_section_sort_idx
  on public.teacher_space_items (space_id, section_id, sort_order asc);
