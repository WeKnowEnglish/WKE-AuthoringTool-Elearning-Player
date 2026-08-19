-- Generic, versioned attempts and teacher reviews for mixed Graded Homework collections.

create table if not exists public.homework_collection_attempts (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  content jsonb not null default '{"version":1,"parts":{}}'::jsonb,
  auto_score integer not null default 0 check (auto_score >= 0),
  auto_max_score integer not null default 0 check (auto_max_score >= 0),
  manual_max_score integer not null default 0 check (manual_max_score >= 0),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

create index if not exists homework_collection_attempts_homework_idx
  on public.homework_collection_attempts(homework_id, updated_at desc);

alter table public.homework_collection_attempts enable row level security;
grant select on public.homework_collection_attempts to authenticated;

create policy homework_collection_attempts_student_select
  on public.homework_collection_attempts for select to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy homework_collection_attempts_teacher_select
  on public.homework_collection_attempts for select to authenticated
  using (public.is_teacher() and exists (
    select 1 from public.class_homework h
    where h.id = homework_id and h.teacher_id = auth.uid()
  ));

create table if not exists public.homework_collection_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.homework_collection_attempts(id) on delete cascade,
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  parts jsonb not null default '{}'::jsonb check (jsonb_typeof(parts) = 'object'),
  feedback text not null default '' check (char_length(feedback) <= 2000),
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homework_collection_reviews_homework_idx
  on public.homework_collection_reviews(homework_id, reviewed_at desc);

alter table public.homework_collection_reviews enable row level security;
grant select on public.homework_collection_reviews to authenticated;

create policy homework_collection_reviews_student_select
  on public.homework_collection_reviews for select to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy homework_collection_reviews_teacher_select
  on public.homework_collection_reviews for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

comment on table public.homework_collection_attempts is
  'Server-scored student work for versioned mixed homework collections.';
