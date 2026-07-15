-- Combine correct-answer challenge finalization + attempt write into one RPC
-- so mark-awarded and attempt insert share a single database round-trip.

create or replace function public.release_live_game_challenge_award_claim(
  p_challenge_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id text;
begin
  update public.live_game_challenges
  set status = 'active',
      claim_started_at = null,
      updated_at = now()
  where id = p_challenge_id
    and status = 'awarding'
  returning id into updated_id;

  return updated_id is not null;
end;
$$;

revoke all on function public.release_live_game_challenge_award_claim(text)
  from public, anon, authenticated;
grant execute on function public.release_live_game_challenge_award_claim(text)
  to service_role;

create or replace function public.finalize_live_game_correct_answer(
  p_challenge_id text,
  p_submission_id uuid,
  p_selected_answer jsonb,
  p_response_time_ms integer,
  p_contribution jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_encounter_id uuid;
  v_submission_index integer;
  v_marked integer;
begin
  update public.live_game_challenges
  set status = 'awarded',
      awarded_at = now(),
      updated_at = now()
  where id = p_challenge_id
    and status in ('awarding', 'awarded');

  get diagnostics v_marked = row_count;
  if v_marked = 0 then
    raise exception 'Live Game challenge % could not be marked awarded', p_challenge_id;
  end if;

  select id into v_encounter_id
  from public.live_game_question_encounters
  where challenge_id = p_challenge_id
  for update;

  if v_encounter_id is null then
    raise exception 'Live Game encounter not found for challenge %', p_challenge_id;
  end if;

  select submission_index into v_submission_index
  from public.live_game_question_attempts
  where encounter_id = v_encounter_id
    and submission_id = p_submission_id;

  if v_submission_index is null then
    select coalesce(max(submission_index), 0) + 1
      into v_submission_index
    from public.live_game_question_attempts
    where encounter_id = v_encounter_id;
  end if;

  insert into public.live_game_question_attempts (
    encounter_id,
    submission_id,
    submission_index,
    selected_answer,
    is_correct,
    response_time_ms,
    contribution
  ) values (
    v_encounter_id,
    p_submission_id,
    v_submission_index,
    p_selected_answer,
    true,
    p_response_time_ms,
    coalesce(p_contribution, '{}'::jsonb)
  )
  on conflict (encounter_id, submission_id)
  do update set
    selected_answer = excluded.selected_answer,
    is_correct = excluded.is_correct,
    response_time_ms = excluded.response_time_ms,
    contribution = excluded.contribution;

  update public.live_game_question_encounters
  set resolution = 'correct',
      resolved_at = now(),
      updated_at = now()
  where id = v_encounter_id
    and resolution = 'open';

  return v_submission_index;
end;
$$;

revoke all on function public.finalize_live_game_correct_answer(
  text, uuid, jsonb, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.finalize_live_game_correct_answer(
  text, uuid, jsonb, integer, jsonb
) to service_role;
