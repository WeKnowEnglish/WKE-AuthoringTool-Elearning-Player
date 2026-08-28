-- Consolidated legacy migration version 019.
-- Supabase tracks one migration per version prefix.

-- Legacy source: 019_lesson_plan.sql

-- Shared lesson plan document (human + AI) and optional structured snapshot for screen generation.
alter table public.lessons
  add column if not exists lesson_plan text not null default '';

alter table public.lessons
  add column if not exists lesson_plan_meta jsonb null;

comment on column public.lessons.lesson_plan is
  'Human-editable lesson plan (markdown or plain text). Source of truth for AI activity generation.';

comment on column public.lessons.lesson_plan_meta is
  'Optional structured snapshot (storyBeatCount, quizGroups, mediaSearchTerms) synced when AI drafts a plan; used when generating screens if still valid.';

-- Legacy source: 019_presentation_to_story_note.sql

-- Legacy `presentation_interactive` interaction payloads are converted at read time in the app
-- (`parseScreenPayload` in lib/lesson-schemas.ts) into `story` payloads with `layout_mode: "slide"`.
--
-- Optional cleanup: update persisted rows so `screen_type` is `story` and `payload` is the migrated JSON:
--   use migratePresentationInteractiveToStory / migratePresentationInteractiveFromParsed in a one-off script
--   with service-role access to `lesson_screens`, or re-save affected screens from the teacher editor.
