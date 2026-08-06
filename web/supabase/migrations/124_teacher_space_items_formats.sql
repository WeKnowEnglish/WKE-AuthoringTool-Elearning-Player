-- Align teacher_space_items.format with studio_activities (097+).
-- Publishing newer bank formats was failing teacher_space_items_format_check
-- from 072, which only allowed MC / letter mixup / flashcards / learning track.

alter table public.teacher_space_items
  drop constraint if exists teacher_space_items_format_check;

alter table public.teacher_space_items
  add constraint teacher_space_items_format_check
  check (format in (
    'multiple_choice',
    'letter_mixup',
    'flashcards',
    'listen_and_choose',
    'line_match',
    'true_false',
    'sentence_scramble',
    'fill_blanks',
    'learning_track',
    'vocabulary_list',
    'explore_hotspots',
    'picture_cloze',
    'verb_table',
    'sentence_columns',
    'word_annotation',
    'picture_writing',
    'question_writing',
    'definition_match',
    'cloze_choice',
    'cloze_open',
    'read_and_answer',
    'picture_story'
  ));

comment on column public.teacher_space_items.format is
  'Frozen Studio activity format; must stay in sync with studio_activities_format_check.';
