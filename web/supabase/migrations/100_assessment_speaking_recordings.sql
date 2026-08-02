-- Private speaking recordings attached to a student's assigned assessment.

create table if not exists public.assessment_speaking_recordings (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  part_id text not null,
  response_id text not null,
  storage_path text not null unique,
  content_type text not null,
  duration_ms int not null check (duration_ms >= 0 and duration_ms <= 180000),
  byte_size int not null check (byte_size > 0 and byte_size <= 8388608),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id, part_id)
);

create index if not exists assessment_speaking_recordings_homework_idx
  on public.assessment_speaking_recordings(homework_id, student_id);

alter table public.assessment_speaking_recordings enable row level security;

create policy "assessment_speaking_student_select"
  on public.assessment_speaking_recordings for select
  to authenticated
  using (student_id = auth.uid());

create policy "assessment_speaking_student_insert"
  on public.assessment_speaking_recordings for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments e
        on e.class_id = h.class_id and e.student_id = auth.uid()
      where h.id = homework_id and h.status = 'assigned'
    )
  );

create policy "assessment_speaking_student_update"
  on public.assessment_speaking_recordings for update
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "assessment_speaking_teacher_select"
  on public.assessment_speaking_recordings for select
  to authenticated
  using (
    exists (
      select 1 from public.class_homework h
      where h.id = homework_id and h.teacher_id = auth.uid()
    )
  );

create policy "assessment_voice_student_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'voice_submissions'
    and (storage.foldername(name))[1] = 'assessment'
    and (storage.foldername(name))[3] = auth.uid()::text
  );

create policy "assessment_voice_student_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'voice_submissions'
    and (storage.foldername(name))[1] = 'assessment'
    and (storage.foldername(name))[3] = auth.uid()::text
  );

grant select, insert, update on public.assessment_speaking_recordings to authenticated;

