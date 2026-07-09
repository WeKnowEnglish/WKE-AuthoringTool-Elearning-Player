-- P7A: Secondary sentence production — student submissions (teacher review in P7B).

create table if not exists public.student_sentence_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  word_item_id text not null,
  sentence_text text not null,
  activity_key text not null default 'secondary_sentence',
  date_key text not null,
  session_word_set_hash text,
  status text not null default 'submitted',
  teacher_user_id uuid references auth.users (id) on delete set null,
  teacher_comment text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  supersedes_id uuid references public.student_sentence_submissions (id) on delete set null,
  evidence_id text,
  constraint student_sentence_submissions_status_check check (
    status in ('submitted', 'approved', 'needs_revision', 'superseded')
  ),
  constraint student_sentence_submissions_sentence_len check (
    char_length(sentence_text) between 1 and 500
  )
);

create index if not exists student_sentence_submissions_student_day_idx
  on public.student_sentence_submissions (student_id, date_key, activity_key);

create index if not exists student_sentence_submissions_student_word_day_idx
  on public.student_sentence_submissions (student_id, word_item_id, date_key, submitted_at desc);

create index if not exists student_sentence_submissions_pending_idx
  on public.student_sentence_submissions (status, submitted_at desc)
  where status = 'submitted';

alter table public.student_sentence_submissions enable row level security;

create policy "student_sentence_submissions_insert_own"
  on public.student_sentence_submissions for insert
  to authenticated
  with check (student_id = auth.uid());

create policy "student_sentence_submissions_select_own"
  on public.student_sentence_submissions for select
  to authenticated
  using (student_id = auth.uid());

grant select, insert on public.student_sentence_submissions to authenticated;
