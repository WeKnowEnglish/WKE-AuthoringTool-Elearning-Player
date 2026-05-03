-- Optional post-lesson interactive layer (same JSON shape as start-screen `playground`).
alter table public.lessons
  add column if not exists completion_playground jsonb;

comment on column public.lessons.completion_playground is
  'Optional bookend playground JSON (page, cast, tap_rewards) shown on RewardScreen after the lesson.';
