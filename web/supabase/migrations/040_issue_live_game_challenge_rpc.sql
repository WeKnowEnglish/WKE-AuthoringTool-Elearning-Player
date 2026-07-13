-- One-round-trip challenge issuance plus a private grading snapshot.

alter table public.live_game_challenges
  add column if not exists validation_payload jsonb;

create or replace function public.issue_live_game_challenge(
  p_id text,
  p_room_id text,
  p_player_id text,
  p_node_id text,
  p_question_id text,
  p_question_set_id uuid,
  p_question_set_version int,
  p_question_bank text,
  p_validation_payload jsonb,
  p_expires_at timestamptz
)
returns setof public.live_game_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.live_game_challenges%rowtype;
begin
  update public.live_game_challenges
  set status = 'expired', updated_at = now()
  where room_id = p_room_id
    and player_id = p_player_id
    and node_id = p_node_id
    and status in ('active', 'awarding')
    and expires_at <= now();

  select * into existing
  from public.live_game_challenges
  where room_id = p_room_id
    and player_id = p_player_id
    and node_id = p_node_id
    and status in ('active', 'awarding')
    and expires_at > now()
  limit 1;

  if found then
    return next existing;
    return;
  end if;

  begin
    insert into public.live_game_challenges (
      id, room_id, player_id, node_id, question_id,
      question_set_id, question_set_version, question_bank,
      validation_payload, status, expires_at, updated_at
    ) values (
      p_id, p_room_id, p_player_id, p_node_id, p_question_id,
      p_question_set_id, p_question_set_version, p_question_bank,
      p_validation_payload, 'active', p_expires_at, now()
    )
    returning * into existing;
  exception when unique_violation then
    select * into existing
    from public.live_game_challenges
    where room_id = p_room_id
      and player_id = p_player_id
      and node_id = p_node_id
      and status in ('active', 'awarding')
    limit 1;
  end;

  return next existing;
end;
$$;

revoke all on function public.issue_live_game_challenge(
  text, text, text, text, text, uuid, int, text, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.issue_live_game_challenge(
  text, text, text, text, text, uuid, int, text, jsonb, timestamptz
) to service_role;
