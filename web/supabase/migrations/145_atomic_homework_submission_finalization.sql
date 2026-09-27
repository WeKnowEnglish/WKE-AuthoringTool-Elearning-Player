-- WKE-002: make scoped homework finalization atomic, retry-safe, and immutable.

create table if not exists public.homework_finalization_legacy_orphans (
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('writing_prompt', 'homework_template', 'graded_track')),
  detected_at timestamptz not null default now(),
  reconciled_at timestamptz,
  primary key (homework_id, student_id, format)
);

alter table public.homework_finalization_legacy_orphans enable row level security;
revoke all on public.homework_finalization_legacy_orphans from public, anon, authenticated;
grant all on public.homework_finalization_legacy_orphans to service_role;

-- Snapshot only pre-migration split-transaction failures. They must be repaired
-- without a reward until an administrator explicitly decides otherwise.
insert into public.homework_finalization_legacy_orphans (homework_id, student_id, format)
select s.homework_id, s.student_id, 'writing_prompt'
from public.homework_writing_submissions s
where s.status = 'submitted'
  and not exists (
    select 1 from public.class_homework_completions c
    where c.homework_id = s.homework_id and c.student_id = s.student_id
  )
on conflict do nothing;

insert into public.homework_finalization_legacy_orphans (homework_id, student_id, format)
select s.homework_id, s.student_id,
  case when h.payload->>'type' = 'graded_track' then 'graded_track' else 'homework_template' end
from public.homework_template_submissions s
join public.class_homework h on h.id = s.homework_id
where s.status = 'submitted'
  and not exists (
    select 1 from public.class_homework_completions c
    where c.homework_id = s.homework_id and c.student_id = s.student_id
  )
on conflict do nothing;

insert into public.homework_finalization_legacy_orphans (homework_id, student_id, format)
select s.homework_id, s.student_id, 'graded_track'
from public.homework_collection_attempts s
where s.status = 'submitted'
  and not exists (
    select 1 from public.class_homework_completions c
    where c.homework_id = s.homework_id and c.student_id = s.student_id
  )
on conflict do nothing;

create or replace function public.finish_homework_finalization(
  p_homework_id uuid,
  p_format text,
  p_submitted_at timestamptz,
  p_questions_total integer default 0,
  p_correct_count integer default 0,
  p_duplicate boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_completion public.class_homework_completions%rowtype;
  v_completion_result jsonb;
  v_reward jsonb;
  v_reconciled boolean := false;
  v_guarded boolean := false;
begin
  select exists (
    select 1 from public.homework_finalization_legacy_orphans o
    where o.homework_id = p_homework_id
      and o.student_id = v_student_id
      and o.format = p_format
  ) into v_guarded;

  if v_guarded and not exists (
    select 1 from public.class_homework_completions c
    where c.homework_id = p_homework_id and c.student_id = v_student_id
  ) then
    insert into public.class_homework_completions (
      homework_id, student_id, finished_at, questions_total, correct_count, updated_at
    ) values (
      p_homework_id, v_student_id, p_submitted_at,
      greatest(0, coalesce(p_questions_total, 0)),
      greatest(0, coalesce(p_correct_count, 0)), now()
    ) on conflict (homework_id, student_id) do nothing;
    update public.homework_finalization_legacy_orphans
      set reconciled_at = coalesce(reconciled_at, now())
      where homework_id = p_homework_id
        and student_id = v_student_id
        and format = p_format;
    v_reconciled := true;
  else
    v_completion_result := public.complete_primary_homework(
      p_homework_id,
      greatest(0, coalesce(p_questions_total, 0))
    );
    v_reward := v_completion_result->'rewardReceipt';
  end if;

  update public.class_homework_completions
  set correct_count = greatest(correct_count, greatest(0, coalesce(p_correct_count, 0))),
      questions_total = greatest(questions_total, greatest(0, coalesce(p_questions_total, 0))),
      updated_at = now()
  where homework_id = p_homework_id and student_id = v_student_id
  returning * into v_completion;

  if not found then raise exception 'homework completion could not be finalized'; end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'homeworkId', p_homework_id,
    'format', p_format,
    'status', 'submitted',
    'submittedAt', p_submitted_at,
    'completedAt', v_completion.finished_at,
    'duplicate', p_duplicate,
    'reconciled', v_reconciled,
    'rewardReceipt', v_reward
  ));
end;
$$;

revoke all on function public.finish_homework_finalization(uuid, text, timestamptz, integer, integer, boolean) from public;

create or replace function public.finalize_homework_writing_submission(
  p_homework_id uuid,
  p_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_homework public.class_homework%rowtype;
  v_submission public.homework_writing_submissions%rowtype;
  v_inserted boolean := false;
  v_duplicate boolean := false;
  v_receipt jsonb;
begin
  if v_student_id is null or not public.is_student() then raise exception 'student authentication required'; end if;
  select * into v_homework from public.class_homework where id = p_homework_id for share;
  if not found or v_homework.payload->>'type' <> 'writing_prompt' then raise exception 'homework not found'; end if;
  if v_homework.status not in ('assigned', 'closed') then raise exception 'homework is not assigned'; end if;
  if not exists (select 1 from public.class_enrollments e where e.class_id = v_homework.class_id and e.student_id = v_student_id) then raise exception 'student is not enrolled in this class'; end if;
  if v_homework.target_student_ids is not null and not (v_student_id = any(v_homework.target_student_ids)) then raise exception 'homework is not assigned to this student'; end if;
  if nullif(btrim(coalesce(p_text, '')), '') is null or char_length(p_text) > 10000 then raise exception 'writing response is invalid'; end if;

  insert into public.homework_writing_submissions (
    homework_id, student_id, status, text, submitted_at, updated_at
  ) values (p_homework_id, v_student_id, 'submitted', p_text, now(), now())
  on conflict (homework_id, student_id) do nothing
  returning * into v_submission;
  v_inserted := found;

  if not v_inserted then
    select * into v_submission from public.homework_writing_submissions
    where homework_id = p_homework_id and student_id = v_student_id for update;
    v_duplicate := v_submission.status = 'submitted';
    if not v_duplicate then
      update public.homework_writing_submissions
      set status = 'submitted', text = p_text, submitted_at = now(), updated_at = now()
      where id = v_submission.id returning * into v_submission;
    end if;
  end if;

  v_receipt := public.finish_homework_finalization(
    p_homework_id, 'writing_prompt', v_submission.submitted_at, 0, 0, v_duplicate
  );
  return jsonb_build_object('receipt', v_receipt, 'submission', to_jsonb(v_submission));
end;
$$;

revoke all on function public.finalize_homework_writing_submission(uuid, text) from public;
grant execute on function public.finalize_homework_writing_submission(uuid, text) to authenticated;

create or replace function public.finalize_homework_template_submission(
  p_homework_id uuid,
  p_content jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_homework public.class_homework%rowtype;
  v_submission public.homework_template_submissions%rowtype;
  v_format text;
  v_inserted boolean := false;
  v_duplicate boolean := false;
  v_receipt jsonb;
begin
  if v_student_id is null or not public.is_student() then raise exception 'student authentication required'; end if;
  select * into v_homework from public.class_homework where id = p_homework_id for share;
  v_format := v_homework.payload->>'type';
  if not found or v_format not in ('homework_template', 'graded_track') then raise exception 'homework not found'; end if;
  if v_homework.status not in ('assigned', 'closed') then raise exception 'homework is not assigned'; end if;
  if not exists (select 1 from public.class_enrollments e where e.class_id = v_homework.class_id and e.student_id = v_student_id) then raise exception 'student is not enrolled in this class'; end if;
  if v_homework.target_student_ids is not null and not (v_student_id = any(v_homework.target_student_ids)) then raise exception 'homework is not assigned to this student'; end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then raise exception 'template response is invalid'; end if;

  insert into public.homework_template_submissions (
    homework_id, student_id, status, content, submitted_at, updated_at
  ) values (p_homework_id, v_student_id, 'submitted', p_content, now(), now())
  on conflict (homework_id, student_id) do nothing
  returning * into v_submission;
  v_inserted := found;

  if not v_inserted then
    select * into v_submission from public.homework_template_submissions
    where homework_id = p_homework_id and student_id = v_student_id for update;
    v_duplicate := v_submission.status = 'submitted';
    if not v_duplicate then
      update public.homework_template_submissions
      set status = 'submitted', content = p_content, submitted_at = now(), updated_at = now()
      where id = v_submission.id returning * into v_submission;
    end if;
  end if;

  v_receipt := public.finish_homework_finalization(
    p_homework_id, v_format, v_submission.submitted_at, 0, 0, v_duplicate
  );
  return jsonb_build_object('receipt', v_receipt, 'submission', to_jsonb(v_submission));
end;
$$;

revoke all on function public.finalize_homework_template_submission(uuid, jsonb) from public;
grant execute on function public.finalize_homework_template_submission(uuid, jsonb) to authenticated;

create or replace function public.finalize_homework_collection_attempt(
  p_homework_id uuid,
  p_content jsonb,
  p_auto_score integer,
  p_auto_max_score integer,
  p_manual_max_score integer,
  p_item_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_homework public.class_homework%rowtype;
  v_attempt public.homework_collection_attempts%rowtype;
  v_inserted boolean := false;
  v_duplicate boolean := false;
  v_receipt jsonb;
begin
  if v_student_id is null or not public.is_student() then raise exception 'student authentication required'; end if;
  select * into v_homework from public.class_homework where id = p_homework_id for share;
  if not found or v_homework.payload->>'type' <> 'graded_track' then raise exception 'homework not found'; end if;
  if v_homework.status not in ('assigned', 'closed') then raise exception 'homework is not assigned'; end if;
  if not exists (select 1 from public.class_enrollments e where e.class_id = v_homework.class_id and e.student_id = v_student_id) then raise exception 'student is not enrolled in this class'; end if;
  if v_homework.target_student_ids is not null and not (v_student_id = any(v_homework.target_student_ids)) then raise exception 'homework is not assigned to this student'; end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then raise exception 'collection response is invalid'; end if;
  if least(p_auto_score, p_auto_max_score, p_manual_max_score, p_item_count) < 0 then raise exception 'collection totals are invalid'; end if;
  if p_auto_score > p_auto_max_score then raise exception 'collection score is invalid'; end if;

  insert into public.homework_collection_attempts (
    homework_id, student_id, status, content, auto_score, auto_max_score,
    manual_max_score, submitted_at, updated_at
  ) values (
    p_homework_id, v_student_id, 'submitted', p_content, p_auto_score,
    p_auto_max_score, p_manual_max_score, now(), now()
  ) on conflict (homework_id, student_id) do nothing
  returning * into v_attempt;
  v_inserted := found;

  if not v_inserted then
    select * into v_attempt from public.homework_collection_attempts
    where homework_id = p_homework_id and student_id = v_student_id for update;
    v_duplicate := v_attempt.status = 'submitted';
    if not v_duplicate then
      update public.homework_collection_attempts
      set status = 'submitted', content = p_content, auto_score = p_auto_score,
          auto_max_score = p_auto_max_score, manual_max_score = p_manual_max_score,
          submitted_at = now(), updated_at = now()
      where id = v_attempt.id returning * into v_attempt;
    end if;
  end if;

  -- A graded track may also contain template segments. Mark their shared row as
  -- submitted inside this same transaction so teacher views cannot disagree.
  update public.homework_template_submissions
  set status = 'submitted', submitted_at = coalesce(submitted_at, v_attempt.submitted_at), updated_at = now()
  where homework_id = p_homework_id and student_id = v_student_id and status = 'in_progress';

  v_receipt := public.finish_homework_finalization(
    p_homework_id, 'graded_track', v_attempt.submitted_at,
    p_item_count, v_attempt.auto_score, v_duplicate
  );
  return jsonb_build_object('receipt', v_receipt, 'attempt', to_jsonb(v_attempt));
end;
$$;

revoke all on function public.finalize_homework_collection_attempt(uuid, jsonb, integer, integer, integer, integer) from public;
grant execute on function public.finalize_homework_collection_attempt(uuid, jsonb, integer, integer, integer, integer) to authenticated;

-- Submitted response payloads are historical records. Reviews use separate
-- columns/tables, so students and service clients must not mutate final answers.
create or replace function public.prevent_submitted_homework_response_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'submitted' and new is distinct from old then
    raise exception 'submitted homework responses are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists immutable_submitted_writing_response on public.homework_writing_submissions;
create trigger immutable_submitted_writing_response before update on public.homework_writing_submissions
for each row execute function public.prevent_submitted_homework_response_mutation();

drop trigger if exists immutable_submitted_template_response on public.homework_template_submissions;
create trigger immutable_submitted_template_response before update on public.homework_template_submissions
for each row execute function public.prevent_submitted_homework_response_mutation();

drop trigger if exists immutable_submitted_collection_response on public.homework_collection_attempts;
create trigger immutable_submitted_collection_response before update on public.homework_collection_attempts
for each row execute function public.prevent_submitted_homework_response_mutation();
