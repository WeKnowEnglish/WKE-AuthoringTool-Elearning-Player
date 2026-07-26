-- Allow vocabulary lists in My Activity Bank (authoring source for LTC / quiz compile).
-- Media must still be preflighted to studio_assets before publish (app-layer).

alter table public.studio_activities
  drop constraint if exists studio_activities_format_check;

alter table public.studio_activities
  add constraint studio_activities_format_check
  check (format in (
    'multiple_choice',
    'letter_mixup',
    'flashcards',
    'learning_track',
    'vocabulary_list'
  ));

comment on column public.studio_activities.pack is
  'Validated Lesson Player pack JSON, or vocabulary-list-pack stub for vocabulary_list rows.';

comment on column public.studio_activities.authoring is
  'Optional Studio authoring document; required for vocabulary_list (VocabularyListDocument).';
