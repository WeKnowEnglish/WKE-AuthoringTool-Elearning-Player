-- Item-level, resumable attempts for class-assigned assessments.

create table if not exists public.class_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.class_homework (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  definition_id text not null,
  content_version text not null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted')),
  active_part_id text not null default '',
  responses jsonb not null default '{}'::jsonb
    check (jsonb_typeof(responses) = 'object'),
  answered_count int not null default 0 check (answered_count >= 0),
  objective_correct int not null default 0 check (objective_correct >= 0),
  objective_total int not null default 0 check (objective_total >= 0),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_assessment_attempt_unique_student unique (homework_id, student_id)
);

create index if not exists class_assessment_attempts_homework_idx
  on public.class_assessment_attempts (homework_id, status, updated_at desc);

create index if not exists class_assessment_attempts_student_idx
  on public.class_assessment_attempts (student_id, updated_at desc);

alter table public.class_assessment_attempts enable row level security;
grant select, insert, update on public.class_assessment_attempts to authenticated;

create policy class_assessment_attempts_student_select
  on public.class_assessment_attempts for select to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy class_assessment_attempts_student_insert
  on public.class_assessment_attempts for insert to authenticated
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments ce
        on ce.class_id = h.class_id and ce.student_id = auth.uid()
      where h.id = homework_id
        and h.status = 'assigned'
        and h.payload ->> 'type' = 'primary_a2_assessment'
    )
  );

create policy class_assessment_attempts_student_update
  on public.class_assessment_attempts for update to authenticated
  using (public.is_student() and student_id = auth.uid())
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments ce
        on ce.class_id = h.class_id and ce.student_id = auth.uid()
      where h.id = homework_id
        and h.status = 'assigned'
        and h.payload ->> 'type' = 'primary_a2_assessment'
    )
  );

create policy class_assessment_attempts_teacher_select
  on public.class_assessment_attempts for select to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1 from public.class_homework h
      where h.id = homework_id and h.teacher_id = auth.uid()
    )
  );
