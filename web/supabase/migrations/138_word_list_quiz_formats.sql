-- First-class word-list games: word search, crossword, and memory.
-- Keep private Activity Bank, classroom Space items, and curated WKE Library aligned.

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
    'wordsearch',
    'crossword',
    'memory',
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
    'wordsearch',
    'crossword',
    'memory',
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

alter table public.wke_library_items
  drop constraint if exists wke_library_items_format_check;

alter table public.wke_library_items
  add constraint wke_library_items_format_check
  check (format in (
    'multiple_choice',
    'letter_mixup',
    'flashcards',
    'listen_and_choose',
    'line_match',
    'true_false',
    'sentence_scramble',
    'fill_blanks',
    'wordsearch',
    'crossword',
    'memory',
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
