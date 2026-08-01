-- Allow sentence_columns (homework-template family) in My Activity Bank.

alter table public.studio_activities
  drop constraint if exists studio_activities_format_check;

alter table public.studio_activities
  add constraint studio_activities_format_check
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
    'sentence_columns'
  ));

comment on column public.studio_activities.authoring is
  'Optional Studio authoring document; required for vocabulary_list, explore_hotspots, picture_cloze, verb_table, and sentence_columns.';
