-- Student written responses for Class Hub writing_prompt homework.

create table if not exists public.homework_writing_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  text text not null default '' check (char_length(text) <= 10000),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

create index if not exists homework_writing_submissions_homework_idx
  on public.homework_writing_submissions(homework_id, updated_at desc);

alter table public.homework_writing_submissions enable row level security;
grant select, insert, update on public.homework_writing_submissions to authenticated;

create policy homework_writing_submissions_student_select
  on public.homework_writing_submissions for select to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy homework_writing_submissions_student_insert
  on public.homework_writing_submissions for insert to authenticated
  with check (
    public.is_student() and student_id = auth.uid() and exists (
      select 1 from public.class_homework h
      join public.class_enrollments e on e.class_id = h.class_id and e.student_id = auth.uid()
      where h.id = homework_id
        and h.status in ('assigned', 'closed')
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );

create policy homework_writing_submissions_student_update
  on public.homework_writing_submissions for update to authenticated
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

create policy homework_writing_submissions_teacher_select
  on public.homework_writing_submissions for select to authenticated
  using (public.is_teacher() and exists (
    select 1 from public.class_homework h where h.id = homework_id and h.teacher_id = auth.uid()
  ));
