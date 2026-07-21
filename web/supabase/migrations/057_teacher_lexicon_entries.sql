-- Teacher-owned lexicon entries (custom words, phrases, slang).
-- Parallel to the platform Primary candidate bank; packs may reference tw_* ids.

create table if not exists public.teacher_lexicon_entries (
  id text primary key,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  surface text not null,
  normalized text not null,
  entry_kind text not null default 'word'
    check (entry_kind in ('word', 'phrase', 'slang', 'name', 'other')),
  pos text
    check (
      pos is null
      or pos in (
        'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'determiner',
        'preposition', 'conjunction', 'number', 'interjection', 'modal', 'particle',
        'unspecified'
      )
    ),
  primary_stage text
    check (
      primary_stage is null
      or primary_stage in ('PRE_A1_1', 'PRE_A1_2', 'A1_1', 'A1_2', 'A2_1', 'A2_2')
    ),
  primary_topic text,
  note text,
  learner_definition_en text,
  learner_meaning_vi text,
  status text not null default 'teacher_draft'
    check (status in ('teacher_draft', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint teacher_lexicon_surface_len check (char_length(trim(surface)) between 1 and 80),
  constraint teacher_lexicon_normalized_len check (char_length(trim(normalized)) between 1 and 80),
  constraint teacher_lexicon_id_prefix check (id ~ '^tw_[a-z0-9_]+$'),
  constraint teacher_lexicon_note_len check (note is null or char_length(note) <= 500),
  constraint teacher_lexicon_def_en_len check (
    learner_definition_en is null or char_length(learner_definition_en) <= 400
  ),
  constraint teacher_lexicon_def_vi_len check (
    learner_meaning_vi is null or char_length(learner_meaning_vi) <= 400
  ),
  constraint teacher_lexicon_topic_len check (
    primary_topic is null or char_length(trim(primary_topic)) between 1 and 64
  )
);

create unique index if not exists teacher_lexicon_teacher_norm_pos_kind_uidx
  on public.teacher_lexicon_entries (
    teacher_id,
    normalized,
    coalesce(pos, ''),
    entry_kind
  )
  where archived_at is null;

create index if not exists teacher_lexicon_teacher_updated_idx
  on public.teacher_lexicon_entries (teacher_id, updated_at desc)
  where archived_at is null;

alter table public.teacher_lexicon_entries enable row level security;

grant select, insert, update, delete on public.teacher_lexicon_entries to authenticated;

create policy teacher_lexicon_owner_select
  on public.teacher_lexicon_entries for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_lexicon_owner_insert
  on public.teacher_lexicon_entries for insert
  to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_lexicon_owner_update
  on public.teacher_lexicon_entries for update
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_lexicon_owner_delete
  on public.teacher_lexicon_entries for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());
