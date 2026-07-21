-- Bind a staged class lesson to a live Virtual Classroom session.

alter table public.class_sessions
  add column if not exists class_lesson_id uuid
    references public.class_lessons (id) on delete set null;

create index if not exists class_sessions_class_lesson_id_idx
  on public.class_sessions (class_lesson_id)
  where class_lesson_id is not null;
