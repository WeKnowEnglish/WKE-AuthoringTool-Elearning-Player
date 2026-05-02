-- Shared lesson plan document (human + AI) and optional structured snapshot for screen generation.
alter table public.lessons
  add column if not exists lesson_plan text not null default '';

alter table public.lessons
  add column if not exists lesson_plan_meta jsonb null;

comment on column public.lessons.lesson_plan is
  'Human-editable lesson plan (markdown or plain text). Source of truth for AI activity generation.';

comment on column public.lessons.lesson_plan_meta is
  'Optional structured snapshot (storyBeatCount, quizGroups, mediaSearchTerms) synced when AI drafts a plan; used when generating screens if still valid.';
