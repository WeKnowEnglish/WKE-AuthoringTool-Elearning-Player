-- Teacher-owned Primary/Secondary word packs (references master vocab candidate IDs).
-- Packs store ordered word IDs + optional notes; they do not duplicate lexeme records.

create table if not exists public.teacher_word_packs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  portal text not null default 'primary'
    check (portal in ('primary', 'secondary')),
  word_ids jsonb not null default '[]'::jsonb,
  notes_by_word_id jsonb not null default '{}'::jsonb,
  class_id uuid references public.teacher_classes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint teacher_word_packs_title_len check (char_length(trim(title)) between 1 and 120),
  constraint teacher_word_packs_word_ids_is_array check (jsonb_typeof(word_ids) = 'array'),
  constraint teacher_word_packs_notes_is_object check (jsonb_typeof(notes_by_word_id) = 'object')
);

create index if not exists teacher_word_packs_teacher_updated_idx
  on public.teacher_word_packs (teacher_id, updated_at desc)
  where archived_at is null;

create index if not exists teacher_word_packs_class_id_idx
  on public.teacher_word_packs (class_id)
  where class_id is not null and archived_at is null;

alter table public.teacher_word_packs enable row level security;

grant select, insert, update, delete on public.teacher_word_packs to authenticated;

create policy teacher_word_packs_owner_select
  on public.teacher_word_packs for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_word_packs_owner_insert
  on public.teacher_word_packs for insert
  to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_word_packs_owner_update
  on public.teacher_word_packs for update
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_word_packs_owner_delete
  on public.teacher_word_packs for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());
