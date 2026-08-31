-- Durable, resumable self-study curriculum session progress.

create table if not exists public.student_course_session_runs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  unit_id text not null,
  session_id text not null,
  content_version text not null,
  status text not null default ''in_progress''
    check (status in (''in_progress'', ''completed'')),
  active_phase text not null default ''hotspot''
    check (active_phase in (''hotspot'', ''practice'')),
  active_step_id text not null default '''',
  state jsonb not null default ''{}''::jsonb
    check (jsonb_typeof(state) = ''object''),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_course_session_runs_course_id_len
    check (char_length(course_id) between 1 and 120),
  constraint student_course_session_runs_unit_id_len
    check (char_length(unit_id) between 1 and 120),
  constraint student_course_session_runs_session_id_len
    check (char_length(session_id) between 1 and 120),
  constraint student_course_session_runs_content_version_len
    check (char_length(content_version) between 1 and 80),
  constraint student_course_session_runs_active_step_len
    check (char_length(active_step_id) <= 120),
  constraint student_course_session_runs_unique_student_session
    unique (student_id, course_id, unit_id, session_id)
);

create index if not exists student_course_session_runs_student_updated_idx
  on public.student_course_session_runs(student_id, updated_at desc);

create index if not exists student_course_session_runs_session_status_idx
  on public.student_course_session_runs(course_id, unit_id, session_id, status);

alter table public.student_course_session_runs enable row level security;
grant select, insert, update on public.student_course_session_runs to authenticated;

create policy student_course_session_runs_student_select
  on public.student_course_session_runs for select
  to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy student_course_session_runs_student_insert
  on public.student_course_session_runs for insert
  to authenticated
  with check (public.is_student() and student_id = auth.uid());

create policy student_course_session_runs_student_update
  on public.student_course_session_runs for update
  to authenticated
  using (public.is_student() and student_id = auth.uid())
  with check (public.is_student() and student_id = auth.uid());
