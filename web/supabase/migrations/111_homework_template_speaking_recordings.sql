-- Private speaking recordings for homework-template activities.

create table if not exists public.homework_template_speaking_recordings (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  part_id text not null,
  response_id text not null,
  storage_path text not null unique,
  content_type text not null,
  duration_ms int not null check (duration_ms >= 0 and duration_ms <= 120000),
  byte_size int not null check (byte_size > 0 and byte_size <= 8388608),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id, part_id)
);

create index if not exists homework_template_speaking_homework_idx
  on public.homework_template_speaking_recordings(homework_id, student_id);

alter table public.homework_template_speaking_recordings enable row level security;

create policy "homework_template_speaking_student_select"
  on public.homework_template_speaking_recordings for select
  to authenticated
  using (student_id = auth.uid());

create policy "homework_template_speaking_student_insert"
  on public.homework_template_speaking_recordings for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments e
        on e.class_id = h.class_id and e.student_id = auth.uid()
      where h.id = homework_id
        and h.status = 'assigned'
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );

create policy "homework_template_speaking_student_update"
  on public.homework_template_speaking_recordings for update
  to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments e
        on e.class_id = h.class_id and e.student_id = auth.uid()
      where h.id = homework_id
        and h.status = 'assigned'
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );

create policy "homework_template_speaking_teacher_select"
  on public.homework_template_speaking_recordings for select
  to authenticated
  using (
    exists (
      select 1 from public.class_homework h
      where h.id = homework_id and h.teacher_id = auth.uid()
    )
  );

create policy "homework_template_voice_student_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'voice_submissions'
    and (storage.foldername(name))[1] = 'homework-template'
    and (storage.foldername(name))[3] = auth.uid()::text
  );

create policy "homework_template_voice_student_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'voice_submissions'
    and (storage.foldername(name))[1] = 'homework-template'
    and (storage.foldername(name))[3] = auth.uid()::text
  );

grant select, insert, update on public.homework_template_speaking_recordings to authenticated;
