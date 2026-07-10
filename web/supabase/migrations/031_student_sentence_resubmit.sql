-- P7C: Student resubmit after teacher requests revision.

create or replace function public.resubmit_student_sentence_submission(
  p_word_item_id text,
  p_date_key text,
  p_sentence_text text,
  p_session_word_set_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_prior public.student_sentence_submissions%rowtype;
  v_new_id uuid;
begin
  if v_student_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(coalesce(p_sentence_text, ''))) < 1
    or char_length(p_sentence_text) > 500 then
    raise exception 'Invalid sentence length';
  end if;

  select *
  into v_prior
  from public.student_sentence_submissions
  where student_id = v_student_id
    and word_item_id = p_word_item_id
    and date_key = p_date_key
    and activity_key = 'secondary_sentence'
    and status = 'needs_revision'
  order by submitted_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No revision request found for this word';
  end if;

  if exists (
    select 1
    from public.student_sentence_submissions
    where student_id = v_student_id
      and word_item_id = p_word_item_id
      and date_key = p_date_key
      and activity_key = 'secondary_sentence'
      and status = 'submitted'
  ) then
    raise exception 'A submission is already waiting for review';
  end if;

  update public.student_sentence_submissions
  set status = 'superseded'
  where id = v_prior.id;

  insert into public.student_sentence_submissions (
    student_id,
    word_item_id,
    sentence_text,
    activity_key,
    date_key,
    session_word_set_hash,
    status,
    supersedes_id
  )
  values (
    v_student_id,
    p_word_item_id,
    trim(p_sentence_text),
    'secondary_sentence',
    p_date_key,
    nullif(trim(p_session_word_set_hash), ''),
    'submitted',
    v_prior.id
  )
  returning id into v_new_id;

  return jsonb_build_object(
    'ok', true,
    'submissionId', v_new_id,
    'supersedesId', v_prior.id
  );
end;
$$;

grant execute on function public.resubmit_student_sentence_submission(text, text, text, text)
  to authenticated;
