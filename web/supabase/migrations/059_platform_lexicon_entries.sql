-- D5: published platform lexicon (promoted from teacher entries) + aliases.

create table if not exists public.platform_lexicon_entries (
  id text primary key,
  lemma text not null,
  normalized text not null,
  entry_kind text not null default 'word'
    check (entry_kind in ('word', 'phrase', 'slang', 'name', 'other')),
  pos text not null default 'noun'
    check (
      pos in (
        'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'determiner',
        'preposition', 'conjunction', 'number', 'interjection', 'modal', 'particle'
      )
    ),
  primary_stage text
    check (
      primary_stage is null
      or primary_stage in ('PRE_A1_1', 'PRE_A1_2', 'A1_1', 'A1_2', 'A2_1', 'A2_2')
    ),
  cefr_band_candidate text
    check (
      cefr_band_candidate is null
      or cefr_band_candidate in ('PRE_A1', 'A1', 'A2')
    ),
  primary_topic text,
  learner_definition_en text,
  learner_meaning_vi text,
  note text,
  vocabulary_lane text not null default 'general_english',
  status text not null default 'published'
    check (status in ('published', 'deprecated')),
  source_teacher_entry_id text,
  promoted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_lexicon_id_prefix check (id ~ '^pv_[a-z0-9_]+$'),
  constraint platform_lexicon_lemma_len check (char_length(trim(lemma)) between 1 and 80),
  constraint platform_lexicon_normalized_len check (char_length(trim(normalized)) between 1 and 80),
  constraint platform_lexicon_topic_len check (
    primary_topic is null or char_length(trim(primary_topic)) between 1 and 64
  ),
  constraint platform_lexicon_def_en_len check (
    learner_definition_en is null or char_length(learner_definition_en) <= 400
  ),
  constraint platform_lexicon_def_vi_len check (
    learner_meaning_vi is null or char_length(learner_meaning_vi) <= 400
  ),
  constraint platform_lexicon_note_len check (note is null or char_length(note) <= 500)
);

create unique index if not exists platform_lexicon_norm_pos_kind_uidx
  on public.platform_lexicon_entries (normalized, pos, entry_kind)
  where status = 'published';

create index if not exists platform_lexicon_updated_idx
  on public.platform_lexicon_entries (updated_at desc)
  where status = 'published';

alter table public.platform_lexicon_entries enable row level security;

grant select on public.platform_lexicon_entries to authenticated;

create policy platform_lexicon_teacher_select
  on public.platform_lexicon_entries for select
  to authenticated
  using (public.is_teacher());

-- Alias columns on teacher lexicon
alter table public.teacher_lexicon_entries
  add column if not exists promoted_to_id text,
  add column if not exists promoted_at timestamptz;

alter table public.teacher_lexicon_entries
  drop constraint if exists teacher_lexicon_promoted_to_prefix;

alter table public.teacher_lexicon_entries
  add constraint teacher_lexicon_promoted_to_prefix
  check (promoted_to_id is null or promoted_to_id ~ '^pv_[a-z0-9_]+$');

create index if not exists teacher_lexicon_promoted_to_idx
  on public.teacher_lexicon_entries (promoted_to_id)
  where promoted_to_id is not null;
