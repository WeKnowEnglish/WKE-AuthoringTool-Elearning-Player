-- Student completions for class homework (pack quiz finish tracking).

create table if not exists public.class_homework_completions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.class_homework (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  finished_at timestamptz not null default now(),
  questions_total int not null default 0
    check (questions_total >= 0),
  correct_count int not null default 0
    check (correct_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_homework_completions_unique_student unique (homework_id, student_id)
);

create index if not exists class_homework_completions_homework_idx
  on public.class_homework_completions (homework_id, finished_at desc);

create index if not exists class_homework_completions_student_idx
  on public.class_homework_completions (student_id, finished_at desc);

alter table public.class_homework_completions enable row level security;

grant select, insert, update on public.class_homework_completions to authenticated;

-- Students: read own completions.
create policy class_homework_completions_student_select
  on public.class_homework_completions for select
  to authenticated
  using (
    public.is_student()
    and student_id = auth.uid()
  );

-- Students: insert own completion when enrolled and homework is assigned/closed.
create policy class_homework_completions_student_insert
  on public.class_homework_completions for insert
  to authenticated
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments ce
        on ce.class_id = h.class_id
       and ce.student_id = auth.uid()
      where h.id = homework_id
        and h.status in ('assigned', 'closed')
    )
  );

-- Students: update own completion (replay / upsert path).
create policy class_homework_completions_student_update
  on public.class_homework_completions for update
  to authenticated
  using (
    public.is_student()
    and student_id = auth.uid()
  )
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments ce
        on ce.class_id = h.class_id
       and ce.student_id = auth.uid()
      where h.id = homework_id
        and h.status in ('assigned', 'closed')
    )
  );

-- Teachers: read completions for homework they own.
create policy class_homework_completions_teacher_select
  on public.class_homework_completions for select
  to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.class_homework h
      where h.id = homework_id
        and h.teacher_id = auth.uid()
    )
  );
