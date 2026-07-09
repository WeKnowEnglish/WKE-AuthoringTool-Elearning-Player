-- 024_student_mastery.sql
-- P1a: durable mastery + evidence tables (schema + RLS only; app wire in P1b–P1d)

create table public.student_mastery_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  target_key text not null,
  target_type text not null,
  record jsonb not null,
  updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint student_mastery_records_target_key_len
    check (char_length(target_key) between 1 and 256),
  constraint student_mastery_records_target_type_check
    check (target_type in (
      'word', 'phrase', 'grammar', 'strand', 'skill', 'standard', 'learning_goal'
    )),
  constraint student_mastery_records_student_target_unique
    unique (student_id, target_key)
);

create index student_mastery_records_student_updated_idx
  on public.student_mastery_records (student_id, updated_at desc);

create table public.student_learning_evidence (
  id uuid primary key,
  student_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null,
  event jsonb not null,
  created_at timestamptz not null default now(),
  constraint student_learning_evidence_student_id_unique
    unique (student_id, id)
);

create index student_learning_evidence_student_occurred_idx
  on public.student_learning_evidence (student_id, occurred_at desc);

alter table public.student_mastery_records enable row level security;
alter table public.student_learning_evidence enable row level security;

create policy "student_mastery_records_select_own"
  on public.student_mastery_records for select
  to authenticated
  using (student_id = auth.uid());

create policy "student_mastery_records_insert_own"
  on public.student_mastery_records for insert
  to authenticated
  with check (student_id = auth.uid());

create policy "student_mastery_records_update_own"
  on public.student_mastery_records for update
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "student_learning_evidence_select_own"
  on public.student_learning_evidence for select
  to authenticated
  using (student_id = auth.uid());

create policy "student_learning_evidence_insert_own"
  on public.student_learning_evidence for insert
  to authenticated
  with check (student_id = auth.uid());

grant select, insert, update on public.student_mastery_records to authenticated;
grant select, insert on public.student_learning_evidence to authenticated;
