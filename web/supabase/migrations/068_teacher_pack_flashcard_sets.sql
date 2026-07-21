-- Teacher-owned flashcard sets generated from word packs (frozen word snapshot + compiled cards).
-- Sibling activity from teacher_pack_quizzes (study vs test).

create table if not exists public.teacher_pack_flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  pack_id uuid references public.teacher_word_packs (id) on delete set null,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  word_ids jsonb not null default '[]'::jsonb,
  options jsonb not null default '{}'::jsonb,
  cards jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint teacher_pack_flashcard_sets_title_len check (char_length(trim(title)) between 1 and 120),
  constraint teacher_pack_flashcard_sets_word_ids_is_array check (jsonb_typeof(word_ids) = 'array'),
  constraint teacher_pack_flashcard_sets_options_is_object check (jsonb_typeof(options) = 'object'),
  constraint teacher_pack_flashcard_sets_cards_is_array check (jsonb_typeof(cards) = 'array'),
  constraint teacher_pack_flashcard_sets_warnings_is_array check (jsonb_typeof(warnings) = 'array')
);

create index if not exists teacher_pack_flashcard_sets_teacher_updated_idx
  on public.teacher_pack_flashcard_sets (teacher_id, updated_at desc)
  where archived_at is null;

create index if not exists teacher_pack_flashcard_sets_pack_id_idx
  on public.teacher_pack_flashcard_sets (pack_id)
  where pack_id is not null and archived_at is null;

alter table public.teacher_pack_flashcard_sets enable row level security;

grant select, insert, update, delete on public.teacher_pack_flashcard_sets to authenticated;

create policy teacher_pack_flashcard_sets_owner_select
  on public.teacher_pack_flashcard_sets for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_pack_flashcard_sets_owner_insert
  on public.teacher_pack_flashcard_sets for insert
  to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_pack_flashcard_sets_owner_update
  on public.teacher_pack_flashcard_sets for update
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_pack_flashcard_sets_owner_delete
  on public.teacher_pack_flashcard_sets for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());
