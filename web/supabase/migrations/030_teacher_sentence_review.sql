-- P7B: Teacher sentence review — enrollment-scoped reads + assessment RPC.

create policy "student_sentence_submissions_teacher_select_enrolled"
  on public.student_sentence_submissions for select
  to authenticated
  using (public.teacher_can_read_student(student_id));

create or replace function public.record_teacher_sentence_assessment(
  p_submission_id uuid,
  p_outcome text,
  p_comment text default null,
  p_evidence jsonb default null,
  p_mastery_records jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.student_sentence_submissions%rowtype;
  v_teacher_id uuid := auth.uid();
  v_rec jsonb;
begin
  if not public.is_teacher() then
    raise exception 'Teacher authentication required';
  end if;

  select *
  into v_submission
  from public.student_sentence_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found';
  end if;

  if not public.teacher_can_read_student(v_submission.student_id) then
    raise exception 'Not allowed to review this student';
  end if;

  if v_submission.status = 'approved' then
    return jsonb_build_object(
      'ok', true,
      'alreadyReviewed', true,
      'submissionId', p_submission_id
    );
  end if;

  if v_submission.status <> 'submitted' then
    raise exception 'Submission is not pending review';
  end if;

  if p_outcome not in ('approve', 'needs_revision') then
    raise exception 'Invalid outcome';
  end if;

  if char_length(coalesce(p_comment, '')) > 500 then
    raise exception 'Comment too long';
  end if;

  if p_outcome = 'needs_revision' then
    update public.student_sentence_submissions
    set
      status = 'needs_revision',
      teacher_user_id = v_teacher_id,
      teacher_comment = nullif(trim(p_comment), ''),
      reviewed_at = now()
    where id = p_submission_id;

    return jsonb_build_object(
      'ok', true,
      'outcome', 'needs_revision',
      'submissionId', p_submission_id
    );
  end if;

  if p_evidence is null or p_mastery_records is null then
    raise exception 'Evidence payload required for approval';
  end if;

  if (p_evidence->>'studentId') <> v_submission.student_id::text then
    raise exception 'Evidence student mismatch';
  end if;

  insert into public.student_learning_evidence (id, student_id, occurred_at, event)
  values (
    p_evidence->>'id',
    v_submission.student_id,
    (p_evidence->>'occurredAt')::timestamptz,
    p_evidence
  )
  on conflict (student_id, id) do nothing;

  for v_rec in select value from jsonb_array_elements(p_mastery_records) as t(value)
  loop
    insert into public.student_mastery_records (
      student_id,
      target_key,
      target_type,
      record,
      updated_at
    )
    values (
      v_submission.student_id,
      v_rec->>'target_key',
      v_rec->>'target_type',
      v_rec->'record',
      coalesce((v_rec->>'updated_at')::timestamptz, now())
    )
    on conflict (student_id, target_key)
    do update set
      target_type = excluded.target_type,
      record = excluded.record,
      updated_at = excluded.updated_at;
  end loop;

  update public.student_sentence_submissions
  set
    status = 'approved',
    teacher_user_id = v_teacher_id,
    teacher_comment = nullif(trim(p_comment), ''),
    reviewed_at = now(),
    evidence_id = p_evidence->>'id'
  where id = p_submission_id;

  return jsonb_build_object(
    'ok', true,
    'outcome', 'approve',
    'submissionId', p_submission_id
  );
end;
$$;

grant execute on function public.record_teacher_sentence_assessment(uuid, text, text, jsonb, jsonb)
  to authenticated;
