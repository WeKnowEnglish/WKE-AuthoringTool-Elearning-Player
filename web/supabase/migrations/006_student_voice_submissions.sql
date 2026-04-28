-- Student voice submissions for speaking activities.

create table if not exists public.student_voice_submissions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  screen_id uuid not null references public.lesson_screens (id) on delete cascade,
  activity_subtype text not null,
  student_session_id text not null,
  student_user_id uuid references auth.users (id) on delete set null,
  turn_id text,
  turn_index int,
  storage_path text not null unique,
  content_type text not null,
  duration_ms int,
  byte_size int not null,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists student_voice_submissions_lesson_idx
  on public.student_voice_submissions (lesson_id, screen_id, submitted_at desc);
create index if not exists student_voice_submissions_session_idx
  on public.student_voice_submissions (student_session_id);

alter table public.student_voice_submissions enable row level security;

create policy "student_voice_submissions_insert_any"
  on public.student_voice_submissions for insert
  to anon, authenticated
  with check (
    student_session_id <> ''
    and byte_size > 0
  );

create policy "student_voice_submissions_teacher_select"
  on public.student_voice_submissions for select
  using (public.is_teacher());

create policy "student_voice_submissions_teacher_update"
  on public.student_voice_submissions for update
  using (public.is_teacher())
  with check (public.is_teacher());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice_submissions',
  'voice_submissions',
  false,
  8388608,
  array[
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/aac',
    'audio/x-m4a'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "voice_submissions_insert_any"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'voice_submissions'
    and (name like '%/%/%/%')
  );

create policy "voice_submissions_teacher_read"
  on storage.objects for select
  using (
    bucket_id = 'voice_submissions'
    and public.is_teacher()
  );

grant insert on public.student_voice_submissions to anon, authenticated;
grant select, update on public.student_voice_submissions to authenticated;
