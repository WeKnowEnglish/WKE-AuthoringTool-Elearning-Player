-- Teacher-scored speaking result returned separately from automatic assessment scoring.

create table if not exists public.assessment_speaking_reviews (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  scores jsonb not null check (jsonb_typeof(scores) = 'object'),
  feedback text not null default '' check (char_length(feedback) <= 2000),
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

alter table public.assessment_speaking_reviews enable row level security;
grant select, insert, update on public.assessment_speaking_reviews to authenticated;

create policy assessment_speaking_reviews_student_select
  on public.assessment_speaking_reviews for select to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy assessment_speaking_reviews_teacher_select
  on public.assessment_speaking_reviews for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy assessment_speaking_reviews_teacher_insert
  on public.assessment_speaking_reviews for insert to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid() and exists (
    select 1 from public.class_homework h where h.id = homework_id and h.teacher_id = auth.uid()
  ));

create policy assessment_speaking_reviews_teacher_update
  on public.assessment_speaking_reviews for update to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());
