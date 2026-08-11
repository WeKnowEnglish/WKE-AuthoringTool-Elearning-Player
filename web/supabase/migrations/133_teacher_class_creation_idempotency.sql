alter table public.teacher_classes
  add column if not exists creation_key uuid;

create unique index if not exists teacher_classes_creation_key_uidx
  on public.teacher_classes (creation_key);

comment on column public.teacher_classes.creation_key is
  'Client-generated idempotency key that prevents repeated class creation submissions.';
