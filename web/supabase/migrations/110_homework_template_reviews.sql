-- Durable teacher grading and feedback for multi-part homework templates.

create table if not exists public.homework_template_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.homework_template_submissions(id) on delete cascade,
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  grades jsonb not null default '{}'::jsonb,
  feedback text not null default '' check (char_length(feedback) <= 2000),
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homework_template_reviews_grades_object check (jsonb_typeof(grades) = 'object')
);

create index if not exists homework_template_reviews_homework_idx
  on public.homework_template_reviews(homework_id, reviewed_at desc);

alter table public.homework_template_reviews enable row level security;
grant select, insert, update on public.homework_template_reviews to authenticated;

create policy homework_template_reviews_student_select
  on public.homework_template_reviews for select to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy homework_template_reviews_teacher_select
  on public.homework_template_reviews for select to authenticated
  using (
    public.is_teacher()
    and teacher_id = auth.uid()
    and exists (
      select 1 from public.class_homework h
      where h.id = homework_id and h.teacher_id = auth.uid()
    )
  );

create policy homework_template_reviews_teacher_insert
  on public.homework_template_reviews for insert to authenticated
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and exists (
      select 1 from public.class_homework h
      where h.id = homework_id and h.teacher_id = auth.uid()
    )
  );

create policy homework_template_reviews_teacher_update
  on public.homework_template_reviews for update to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and exists (
      select 1 from public.class_homework h
      where h.id = homework_id and h.teacher_id = auth.uid()
    )
  );

-- Migration 102 predated individual homework audiences. Keep direct student writes
-- aligned with the class_homework targeting policy added in migration 103.
drop policy if exists homework_template_submissions_student_insert on public.homework_template_submissions;
create policy homework_template_submissions_student_insert
  on public.homework_template_submissions for insert to authenticated
  with check (
    public.is_student() and student_id = auth.uid() and exists (
      select 1 from public.class_homework h
      join public.class_enrollments e on e.class_id = h.class_id and e.student_id = auth.uid()
      where h.id = homework_id
        and h.status in ('assigned', 'closed')
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );

drop policy if exists homework_template_submissions_student_update on public.homework_template_submissions;
create policy homework_template_submissions_student_update
  on public.homework_template_submissions for update to authenticated
  using (public.is_student() and student_id = auth.uid())
  with check (
    public.is_student() and student_id = auth.uid() and exists (
      select 1 from public.class_homework h
      join public.class_enrollments e on e.class_id = h.class_id and e.student_id = auth.uid()
      where h.id = homework_id
        and h.status in ('assigned', 'closed')
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );
