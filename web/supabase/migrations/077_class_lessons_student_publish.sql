-- Student-visible published class materials (async Classroom projection).

alter table public.class_lessons
  add column if not exists published_at timestamptz;

create index if not exists class_lessons_class_published_idx
  on public.class_lessons (class_id, published_at desc)
  where published_at is not null;

-- Enrolled students can read published lessons for their classes.
create policy class_lessons_student_select_published
  on public.class_lessons for select
  to authenticated
  using (
    public.is_student()
    and published_at is not null
    and exists (
      select 1
      from public.class_enrollments ce
      where ce.class_id = class_lessons.class_id
        and ce.student_id = auth.uid()
    )
  );

-- Enrolled students can read step titles/kinds for published lessons.
create policy class_lesson_steps_student_select_published
  on public.class_lesson_steps for select
  to authenticated
  using (
    public.is_student()
    and exists (
      select 1
      from public.class_lessons cl
      join public.class_enrollments ce on ce.class_id = cl.class_id
      where cl.id = lesson_id
        and cl.published_at is not null
        and ce.student_id = auth.uid()
    )
  );
