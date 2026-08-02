-- Reviewable student work for multi-part homework templates.

create table if not exists public.homework_template_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  content jsonb not null default '{"schemaVersion":1,"parts":{}}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

create index if not exists homework_template_submissions_homework_idx
  on public.homework_template_submissions(homework_id, updated_at desc);

alter table public.homework_template_submissions enable row level security;
grant select, insert, update on public.homework_template_submissions to authenticated;

create policy homework_template_submissions_student_select
  on public.homework_template_submissions for select to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy homework_template_submissions_student_insert
  on public.homework_template_submissions for insert to authenticated
  with check (
    public.is_student() and student_id = auth.uid() and exists (
      select 1 from public.class_homework h
      join public.class_enrollments e on e.class_id = h.class_id and e.student_id = auth.uid()
      where h.id = homework_id and h.status in ('assigned', 'closed')
    )
  );

create policy homework_template_submissions_student_update
  on public.homework_template_submissions for update to authenticated
  using (public.is_student() and student_id = auth.uid())
  with check (public.is_student() and student_id = auth.uid());

create policy homework_template_submissions_teacher_select
  on public.homework_template_submissions for select to authenticated
  using (public.is_teacher() and exists (
    select 1 from public.class_homework h where h.id = homework_id and h.teacher_id = auth.uid()
  ));
