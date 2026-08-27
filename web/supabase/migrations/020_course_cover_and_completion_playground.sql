-- Consolidated legacy migration version 020.
-- Supabase tracks one migration per version prefix.

-- Legacy source: 020_course_cover_image.sql

alter table public.courses
  add column if not exists cover_image_url text;

-- Legacy source: 020_lesson_completion_playground.sql

-- Optional post-lesson interactive layer (same JSON shape as start-screen `playground`).
alter table public.lessons
  add column if not exists completion_playground jsonb;

comment on column public.lessons.completion_playground is
  'Optional bookend playground JSON (page, cast, tap_rewards) shown on RewardScreen after the lesson.';
