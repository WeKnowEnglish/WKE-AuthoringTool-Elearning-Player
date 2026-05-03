alter table public.courses
  add column if not exists cover_image_url text,
  add column if not exists cover_video_url text;
