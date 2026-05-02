-- Ordered learning goals / objectives for lessons (teacher + AI authoring).
alter table public.lessons
  add column if not exists learning_goals jsonb not null default '[]'::jsonb;

comment on column public.lessons.learning_goals is
  'Ordered array of objective strings (JSON array). Normalized on save in the app.';
