-- Allow explore-hotspots scene activities in My Activity Bank.
-- Authoring is the `.wkeactivity` document; pack is the Lesson Player explore_hotspots payload.

alter table public.studio_activities
  drop constraint if exists studio_activities_format_check;

alter table public.studio_activities
  add constraint studio_activities_format_check
  check (format in (
    'multiple_choice',
    'letter_mixup',
    'flashcards',
    'learning_track',
    'vocabulary_list',
    'explore_hotspots'
  ));

comment on column public.studio_activities.pack is
  'Validated Lesson Player pack JSON; vocabulary-list-pack stub for vocabulary_list; explore_hotspots payload for explore_hotspots.';

comment on column public.studio_activities.authoring is
  'Optional Studio authoring document; required for vocabulary_list and explore_hotspots (.wkeactivity).';
