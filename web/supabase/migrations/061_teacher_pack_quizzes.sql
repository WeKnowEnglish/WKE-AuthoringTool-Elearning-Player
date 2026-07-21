-- Teacher-owned quizzes generated from word packs (frozen word snapshot + compiled questions).
-- Kept separate from teacher_word_packs so pack edits do not mutate saved quizzes.
-- Not reusing activity_library_items (orphaned app layer, wrong columns).

create table if not exists public.teacher_pack_quizzes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  pack_id uuid references public.teacher_word_packs (id) on delete set null,
  title text not null,
  format text not null
    check (format in ('multiple_choice', 'true_false', 'letter_scramble', 'sentence_scramble')),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  word_ids jsonb not null default '[]'::jsonb,
  options jsonb not null default '{}'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint teacher_pack_quizzes_title_len check (char_length(trim(title)) between 1 and 120),
  constraint teacher_pack_quizzes_word_ids_is_array check (jsonb_typeof(word_ids) = 'array'),
  constraint teacher_pack_quizzes_options_is_object check (jsonb_typeof(options) = 'object'),
  constraint teacher_pack_quizzes_questions_is_array check (jsonb_typeof(questions) = 'array'),
  constraint teacher_pack_quizzes_warnings_is_array check (jsonb_typeof(warnings) = 'array')
);

create index if not exists teacher_pack_quizzes_teacher_updated_idx
  on public.teacher_pack_quizzes (teacher_id, updated_at desc)
  where archived_at is null;

create index if not exists teacher_pack_quizzes_pack_id_idx
  on public.teacher_pack_quizzes (pack_id)
  where pack_id is not null and archived_at is null;

alter table public.teacher_pack_quizzes enable row level security;

grant select, insert, update, delete on public.teacher_pack_quizzes to authenticated;

create policy teacher_pack_quizzes_owner_select
  on public.teacher_pack_quizzes for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_pack_quizzes_owner_insert
  on public.teacher_pack_quizzes for insert
  to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_pack_quizzes_owner_update
  on public.teacher_pack_quizzes for update
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_pack_quizzes_owner_delete
  on public.teacher_pack_quizzes for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());
