-- Remove reporting from Live Game latency-critical loops.
-- Both functions are service-role only and retain idempotency under retries.

create or replace function public.open_live_game_question_encounter(
  p_room_id text,
  p_challenge_id text,
  p_player_id text,
  p_question_id text,
  p_question_set_id uuid,
  p_question_set_version integer,
  p_question_bank text,
  p_question_type text,
  p_question_prompt text,
  p_correct_answer jsonb,
  p_learning_target_key text,
  p_learning_target_label text,
  p_cefr_level text,
  p_game_action_type text,
  p_game_object_id text,
  p_resource_type text,
  p_recipe_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_id uuid;
  v_encounter_id uuid;
begin
  select id into v_round_id
  from public.live_game_report_rounds
  where room_id = p_room_id
    and status = 'active';

  if v_round_id is null then
    raise exception 'Active Live Game report round not found for room %', p_room_id;
  end if;

  insert into public.live_game_question_encounters (
    round_id, challenge_id, player_id, question_id,
    question_set_id, question_set_version, question_bank, question_type,
    question_prompt, correct_answer, learning_target_key, learning_target_label,
    cefr_level, game_action_type, game_object_id, resource_type, recipe_id
  ) values (
    v_round_id, p_challenge_id, p_player_id, p_question_id,
    p_question_set_id, p_question_set_version, p_question_bank, p_question_type,
    p_question_prompt, p_correct_answer, p_learning_target_key, p_learning_target_label,
    p_cefr_level, p_game_action_type, p_game_object_id, p_resource_type, p_recipe_id
  )
  on conflict (challenge_id)
  do update set challenge_id = excluded.challenge_id
  returning id into v_encounter_id;

  return v_encounter_id;
end;
$$;

revoke all on function public.open_live_game_question_encounter(
  text, text, text, text, uuid, integer, text, text, text, jsonb,
  text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.open_live_game_question_encounter(
  text, text, text, text, uuid, integer, text, text, text, jsonb,
  text, text, text, text, text, text, text
) to service_role;

create or replace function public.record_live_game_question_attempt(
  p_challenge_id text,
  p_submission_id uuid,
  p_selected_answer jsonb,
  p_is_correct boolean,
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
begin
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
    p_is_correct,
    p_response_time_ms,
    coalesce(p_contribution, '{}'::jsonb)
  )
  on conflict (encounter_id, submission_id)
  do update set
    selected_answer = excluded.selected_answer,
    is_correct = excluded.is_correct,
    response_time_ms = excluded.response_time_ms,
    contribution = excluded.contribution;

  if p_is_correct then
    update public.live_game_question_encounters
    set resolution = 'correct',
        resolved_at = now(),
        updated_at = now()
    where id = v_encounter_id
      and resolution = 'open';
  end if;

  return v_submission_index;
end;
$$;

revoke all on function public.record_live_game_question_attempt(
  text, uuid, jsonb, boolean, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.record_live_game_question_attempt(
  text, uuid, jsonb, boolean, integer, jsonb
) to service_role;

create or replace function public.finalize_live_game_report_round(
  p_round_id uuid,
  p_end_reason text,
  p_ended_at timestamptz,
  p_summary jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if p_end_reason not in ('objective_completed', 'timeout', 'host_ended_early') then
    raise exception 'Invalid Live Game end reason';
  end if;

  select status into v_status
  from public.live_game_report_rounds
  where id = p_round_id
  for update;

  if v_status is null then
    raise exception 'Live Game report round not found';
  end if;

  if v_status <> 'active' then
    return false;
  end if;

  update public.live_game_question_encounters encounter
  set resolution = case
        when exists (
          select 1
          from public.live_game_question_attempts attempt
          where attempt.encounter_id = encounter.id
        ) then 'unresolved'
        else 'abandoned'
      end,
      resolved_at = p_ended_at,
      updated_at = p_ended_at
  where encounter.round_id = p_round_id
    and encounter.resolution = 'open';

  update public.live_game_report_rounds
  set status = 'completed',
      end_reason = p_end_reason,
      ended_at = p_ended_at,
      summary = coalesce(p_summary, '{}'::jsonb)
  where id = p_round_id;

  perform public.record_live_game_class_project_contribution(p_round_id);
  return true;
end;
$$;

revoke all on function public.finalize_live_game_report_round(
  uuid, text, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.finalize_live_game_report_round(
  uuid, text, timestamptz, jsonb
) to service_role;
