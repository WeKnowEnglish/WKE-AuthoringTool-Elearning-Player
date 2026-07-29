-- Expand class stream posts: links + homework reminders.

alter table public.class_posts
  drop constraint if exists class_posts_kind_check;

alter table public.class_posts
  add column if not exists link_url text,
  add column if not exists link_title text,
  add column if not exists homework_id uuid references public.class_homework (id) on delete set null;

alter table public.class_posts
  add constraint class_posts_kind_check
  check (kind in ('announcement', 'photo', 'link', 'homework_reminder'));

alter table public.class_posts
  drop constraint if exists class_posts_photo_requires_image;

alter table public.class_posts
  add constraint class_posts_photo_requires_image check (
    kind <> 'photo' or image_url is not null
  );

alter table public.class_posts
  drop constraint if exists class_posts_announcement_has_body;

alter table public.class_posts
  add constraint class_posts_announcement_has_body check (
    kind <> 'announcement' or char_length(trim(body)) >= 1
  );

alter table public.class_posts
  drop constraint if exists class_posts_link_requires_url;

alter table public.class_posts
  add constraint class_posts_link_requires_url check (
    kind <> 'link' or (
      link_url is not null and char_length(trim(link_url)) between 1 and 2048
    )
  );

alter table public.class_posts
  drop constraint if exists class_posts_homework_reminder_requires_homework;

alter table public.class_posts
  add constraint class_posts_homework_reminder_requires_homework check (
    kind <> 'homework_reminder' or homework_id is not null
  );

alter table public.class_posts
  drop constraint if exists class_posts_link_url_len;

alter table public.class_posts
  add constraint class_posts_link_url_len check (
    link_url is null or char_length(trim(link_url)) between 1 and 2048
  );

alter table public.class_posts
  drop constraint if exists class_posts_link_title_len;

alter table public.class_posts
  add constraint class_posts_link_title_len check (
    link_title is null or char_length(trim(link_title)) between 1 and 200
  );

create index if not exists class_posts_homework_id_idx
  on public.class_posts (homework_id)
  where homework_id is not null;
