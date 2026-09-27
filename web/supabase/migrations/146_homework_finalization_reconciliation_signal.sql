-- WKE-002 follow-up: distinguish a retry that repairs a submitted response
-- without a completion from an ordinary duplicate retry.
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
  v_had_completion boolean := false;
  v_reconciled boolean := false;
  v_guarded boolean := false;
begin
  select exists (
    select 1 from public.class_homework_completions c
    where c.homework_id = p_homework_id and c.student_id = v_student_id
  ) into v_had_completion;
  v_reconciled := p_duplicate and not v_had_completion;

  select exists (
    select 1 from public.homework_finalization_legacy_orphans o
    where o.homework_id = p_homework_id
      and o.student_id = v_student_id
      and o.format = p_format
  ) into v_guarded;

  if v_guarded and not v_had_completion then
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
