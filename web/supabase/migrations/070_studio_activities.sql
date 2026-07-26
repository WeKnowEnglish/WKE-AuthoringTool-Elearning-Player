-- =============================================================================
-- Slice 1: EDU Studio Activity Bank (additive — does not alter teacher_pack_*)
-- =============================================================================
-- V1 contract (Slice 0) — My Activity Bank staging for Studio → LP:
--
--   • Table: public.studio_activities
--       Durable teacher-owned catalog of published Studio packs (staging area).
--   • UI home: /teacher/classes left sidebar "My Activity Bank"
--   • App write path: Studio → LP POST /api/studio/activities (media preflight first)
--   • Play path: pilots ?activity=<id> via GET /api/studio/activities/[id]
--   • List path: GET /api/studio/activities (teacher cookie / Bearer)
--
-- Media preflight (Studio export, app-layer — not enforced in SQL):
--   Before POST /api/studio/activities, Studio must scan the pack (and authoring
--   if needed) for data: / blob: image and audio URLs, upload each via
--   POST /api/studio/assets, rewrite fields to public studio_media URLs, then
--   publish the pack. Already-https URLs are left unchanged.
--
-- Out of scope (this migration / V1 bank):
--   • Class homework assign / assignable-activities wiring
--   • Merging into teacher_pack_quizzes / teacher_pack_flashcard_sets
--   • listen_and_choose / fill_blanks / matching formats
--   • Student-facing share links without teacher session
--   • Reviving activity_library_items
-- =============================================================================

create table if not exists public.studio_activities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  format text not null
    check (format in (
      'multiple_choice',
      'letter_mixup',
      'flashcards',
      'learning_track'
    )),
  title text not null,
  pack jsonb not null,
  authoring jsonb,
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_activities_title_len
    check (char_length(trim(title)) between 1 and 160),
  constraint studio_activities_pack_is_object
    check (jsonb_typeof(pack) = 'object'),
  constraint studio_activities_authoring_is_object_or_null
    check (authoring is null or jsonb_typeof(authoring) = 'object'),
  constraint studio_activities_source_is_object
    check (jsonb_typeof(source) = 'object')
);

create index if not exists studio_activities_teacher_updated_idx
  on public.studio_activities (teacher_id, updated_at desc);

create index if not exists studio_activities_teacher_format_updated_idx
  on public.studio_activities (teacher_id, format, updated_at desc);

create index if not exists studio_activities_created_at_idx
  on public.studio_activities (created_at desc);

alter table public.studio_activities enable row level security;

grant select, insert, update, delete on public.studio_activities to authenticated;

drop policy if exists studio_activities_owner_select on public.studio_activities;
create policy studio_activities_owner_select
  on public.studio_activities for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists studio_activities_owner_insert on public.studio_activities;
create policy studio_activities_owner_insert
  on public.studio_activities for insert
  to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists studio_activities_owner_update on public.studio_activities;
create policy studio_activities_owner_update
  on public.studio_activities for update
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists studio_activities_owner_delete on public.studio_activities;
create policy studio_activities_owner_delete
  on public.studio_activities for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

comment on table public.studio_activities is
  'EDU Studio → Lesson Player Activity Bank. Teacher-owned published packs for staging/play; not class homework.';

comment on column public.studio_activities.pack is
  'Validated Lesson Player pack JSON (mc_quiz / letter_mixup / flashcards / learning_track shapes).';

comment on column public.studio_activities.authoring is
  'Optional Studio authoring document snapshot for later round-trip edit.';

comment on column public.studio_activities.source is
  'Export metadata from Studio (filename, listId, etc.).';
