-- Allow picture_cloze (homework-template family) plus previously shipped quiz formats
-- that were added in app code after migration 075.

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
    'picture_cloze'
  ));

comment on column public.studio_activities.pack is
  'Validated Lesson Player pack JSON; vocabulary-list-pack / picture-cloze-pack stubs embed authoring for non-LP formats; explore_hotspots payload for explore_hotspots.';

comment on column public.studio_activities.authoring is
  'Optional Studio authoring document; required for vocabulary_list, explore_hotspots, and picture_cloze.';
