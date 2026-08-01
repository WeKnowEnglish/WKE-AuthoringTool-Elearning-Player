-- Allow remaining reading homework modules in My Activity Bank.

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

comment on column public.studio_activities.authoring is
  'Optional Studio authoring document; required for vocabulary_list, explore_hotspots, picture_cloze, verb_table, sentence_columns, word_annotation, picture_writing, question_writing, definition_match, cloze_choice, cloze_open, read_and_answer, and picture_story.';
