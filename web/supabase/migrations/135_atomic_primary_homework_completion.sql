-- Save an assigned Primary homework completion and its one-time reward in one transaction.
create or replace function public.complete_primary_homework(
  p_homework_id uuid,
  p_questions_total integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_homework public.class_homework%rowtype;
  v_completion public.class_homework_completions%rowtype;
  v_receipt jsonb;
begin
  if v_student_id is null or not public.is_student() then
    raise exception 'student authentication required';
  end if;
  select * into v_homework from public.class_homework where id = p_homework_id for share;
  if not found then raise exception 'homework not found'; end if;
  if v_homework.status not in ('assigned', 'closed') then raise exception 'homework is not assigned'; end if;
  if not exists (select 1 from public.class_enrollments ce where ce.class_id = v_homework.class_id and ce.student_id = v_student_id) then
    raise exception 'student is not enrolled in this class';
  end if;
  if v_homework.target_student_ids is not null and not (v_student_id = any(v_homework.target_student_ids)) then
    raise exception 'homework is not assigned to this student';
  end if;

  insert into public.class_homework_completions (homework_id, student_id, finished_at, questions_total, correct_count, updated_at)
  values (p_homework_id, v_student_id, now(), greatest(0, coalesce(p_questions_total, 0)), 0, now())
  on conflict (homework_id, student_id) do update
    set questions_total = greatest(public.class_homework_completions.questions_total, excluded.questions_total),
        updated_at = now()
  returning * into v_completion;

  v_receipt := public.apply_primary_reward(
    'primary:homework:' || p_homework_id::text, 'homework_completion',
    p_homework_id::text, 'assigned_homework', jsonb_build_object('classId', v_homework.class_id)
  );
  return jsonb_build_object('finishedAt', v_completion.finished_at, 'rewardReceipt', v_receipt);
end;
$$;

revoke all on function public.complete_primary_homework(uuid, integer) from public;
grant execute on function public.complete_primary_homework(uuid, integer) to authenticated;
