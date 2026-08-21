-- Primary player progression: server-authoritative economy, idempotent reward ledger,
-- local-v1 import, and the first two player upgrades.

create table if not exists public.primary_player_profiles (
  student_id uuid primary key references auth.users (id) on delete cascade,
  total_xp bigint not null default 0 check (total_xp >= 0),
  gold_balance bigint not null default 0 check (gold_balance >= 0),
  unspent_skill_points integer not null default 0 check (unspent_skill_points >= 0),
  skill_ranks jsonb not null default '{"activity_xp":0,"activity_gold":0}'::jsonb,
  economy_version integer not null default 2 check (economy_version >= 1),
  imported_local_rewards_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint primary_player_profiles_skill_ranks_object
    check (jsonb_typeof(skill_ranks) = 'object')
);

create table if not exists public.primary_reward_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  reward_kind text not null,
  activity_id text,
  source text not null default 'student_hub',
  base_xp integer not null default 0,
  base_gold integer not null default 0,
  xp_bonus integer not null default 0,
  gold_bonus integer not null default 0,
  level_gold integer not null default 0,
  skill_points_delta integer not null default 0,
  levels_gained integer[] not null default '{}'::integer[],
  metadata jsonb not null default '{}'::jsonb,
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  constraint primary_reward_events_event_id_len
    check (char_length(event_id) between 1 and 240),
  constraint primary_reward_events_kind_len
    check (char_length(reward_kind) between 1 and 80),
  constraint primary_reward_events_source_len
    check (char_length(source) between 1 and 80),
  constraint primary_reward_events_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  unique (student_id, event_id)
);

create index if not exists primary_reward_events_student_created_idx
  on public.primary_reward_events (student_id, created_at desc);

alter table public.primary_player_profiles enable row level security;
alter table public.primary_reward_events enable row level security;

create policy "primary_player_profiles_select_own"
  on public.primary_player_profiles for select
  using (student_id = auth.uid() and public.is_student());

create policy "primary_reward_events_select_own"
  on public.primary_reward_events for select
  using (student_id = auth.uid() and public.is_student());

grant select on public.primary_player_profiles to authenticated;
grant select on public.primary_reward_events to authenticated;

create or replace function public.primary_xp_required_for_level(p_level integer)
returns bigint
language sql
immutable
set search_path = public
as $$
  select case
    when p_level < 1 then 0::bigint
    when p_level >= 100 then 0::bigint
    else (40 + p_level * 10)::bigint
  end;
$$;

create or replace function public.primary_level_from_xp(p_total_xp bigint)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_level integer := 1;
  v_remaining bigint := greatest(0, coalesce(p_total_xp, 0));
  v_required bigint;
begin
  while v_level < 100 loop
    v_required := public.primary_xp_required_for_level(v_level);
    exit when v_required <= 0 or v_remaining < v_required;
    v_remaining := v_remaining - v_required;
    v_level := v_level + 1;
  end loop;
  return v_level;
end;
$$;

create or replace function public.primary_player_profile_json(
  p_student_id uuid,
  p_total_xp bigint,
  p_gold_balance bigint,
  p_unspent_skill_points integer,
  p_skill_ranks jsonb,
  p_economy_version integer,
  p_imported_local_rewards_at timestamptz,
  p_updated_at timestamptz
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'studentId', p_student_id,
    'totalXp', p_total_xp,
    'goldBalance', p_gold_balance,
    'unspentSkillPoints', p_unspent_skill_points,
    'skillRanks', coalesce(p_skill_ranks, '{}'::jsonb),
    'economyVersion', p_economy_version,
    'level', public.primary_level_from_xp(p_total_xp),
    'importedLocalRewardsAt', p_imported_local_rewards_at,
    'updatedAt', p_updated_at
  );
$$;

create or replace function public.primary_player_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_profile public.primary_player_profiles%rowtype;
begin
  if v_student_id is null or not public.is_student() then
    raise exception 'student authentication required';
  end if;

  insert into public.primary_player_profiles (student_id)
  values (v_student_id)
  on conflict (student_id) do nothing;

  select * into v_profile
  from public.primary_player_profiles
  where student_id = v_student_id;

  return public.primary_player_profile_json(
    v_profile.student_id,
    v_profile.total_xp,
    v_profile.gold_balance,
    v_profile.unspent_skill_points,
    v_profile.skill_ranks,
    v_profile.economy_version,
    v_profile.imported_local_rewards_at,
    v_profile.updated_at
  );
end;
$$;

create or replace function public.apply_primary_reward(
  p_event_id text,
  p_reward_kind text,
  p_activity_id text default null,
  p_source text default 'student_hub',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_event_id text := trim(coalesce(p_event_id, ''));
  v_kind text := lower(trim(coalesce(p_reward_kind, '')));
  v_source text := lower(trim(coalesce(p_source, 'student_hub')));
  v_profile public.primary_player_profiles%rowtype;
  v_existing jsonb;
  v_base_xp integer := 0;
  v_base_gold integer := 0;
  v_xp_rank integer := 0;
  v_gold_rank integer := 0;
  v_xp_bonus integer := 0;
  v_gold_bonus integer := 0;
  v_old_level integer;
  v_new_level integer;
  v_levels integer[] := '{}'::integer[];
  v_level_gold integer := 0;
  v_skill_points integer := 0;
  v_total_xp bigint;
  v_total_gold bigint;
  v_updated_at timestamptz := now();
  v_receipt jsonb;
  v_level integer;
begin
  if v_student_id is null or not public.is_student() then
    raise exception 'student authentication required';
  end if;
  if char_length(v_event_id) < 1 or char_length(v_event_id) > 240 then
    raise exception 'invalid reward event id';
  end if;
  if char_length(v_source) < 1 or char_length(v_source) > 80 then
    raise exception 'invalid reward source';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'reward metadata must be an object';
  end if;

  case v_kind
    when 'micro_activity' then v_base_xp := 10; v_base_gold := 2;
    when 'standard_activity' then v_base_xp := 20; v_base_gold := 5;
    when 'substantial_lesson' then v_base_xp := 40; v_base_gold := 10;
    when 'homework_completion' then v_base_xp := 30; v_base_gold := 8;
    when 'review_completion' then v_base_xp := 10; v_base_gold := 3;
    when 'daily_goal' then v_base_xp := 20; v_base_gold := 5;
    when 'game_learning' then v_base_xp := 10; v_base_gold := 3;
    else raise exception 'unsupported primary reward kind: %', v_kind;
  end case;

  insert into public.primary_player_profiles (student_id)
  values (v_student_id)
  on conflict (student_id) do nothing;

  select * into v_profile
  from public.primary_player_profiles
  where student_id = v_student_id
  for update;

  select receipt into v_existing
  from public.primary_reward_events
  where student_id = v_student_id and event_id = v_event_id;

  if v_existing is not null then
    return v_existing || jsonb_build_object('duplicate', true);
  end if;

  v_xp_rank := greatest(0, least(5, coalesce((v_profile.skill_ranks ->> 'activity_xp')::integer, 0)));
  v_gold_rank := greatest(0, least(5, coalesce((v_profile.skill_ranks ->> 'activity_gold')::integer, 0)));
  -- Five percent per rank is deliberately visible on full-activity receipts.
  v_xp_bonus := round(v_base_xp * (v_xp_rank * 5)::numeric / 100)::integer;
  v_gold_bonus := round(v_base_gold * (v_gold_rank * 5)::numeric / 100)::integer;

  v_old_level := public.primary_level_from_xp(v_profile.total_xp);
  v_total_xp := v_profile.total_xp + v_base_xp + v_xp_bonus;
  v_new_level := public.primary_level_from_xp(v_total_xp);

  if v_new_level > v_old_level then
    for v_level in (v_old_level + 1)..v_new_level loop
      v_levels := array_append(v_levels, v_level);
    end loop;
    v_skill_points := v_new_level - v_old_level;
    v_level_gold := 20 * (v_new_level - v_old_level);
  end if;

  v_total_gold := v_profile.gold_balance + v_base_gold + v_gold_bonus + v_level_gold;

  update public.primary_player_profiles
  set total_xp = v_total_xp,
      gold_balance = v_total_gold,
      unspent_skill_points = unspent_skill_points + v_skill_points,
      economy_version = 2,
      updated_at = v_updated_at
  where student_id = v_student_id
  returning * into v_profile;

  v_receipt := jsonb_build_object(
    'eventId', v_event_id,
    'rewardKind', v_kind,
    'activityId', nullif(trim(coalesce(p_activity_id, '')), ''),
    'source', v_source,
    'baseXp', v_base_xp,
    'baseGold', v_base_gold,
    'xpBonus', v_xp_bonus,
    'goldBonus', v_gold_bonus,
    'xpDelta', v_base_xp + v_xp_bonus,
    'activityGoldDelta', v_base_gold + v_gold_bonus,
    'levelGoldDelta', v_level_gold,
    'goldDelta', v_base_gold + v_gold_bonus + v_level_gold,
    'skillPointsDelta', v_skill_points,
    'levelBefore', v_old_level,
    'levelAfter', v_new_level,
    'levelsGained', to_jsonb(v_levels),
    'duplicate', false,
    'profile', public.primary_player_profile_json(
      v_profile.student_id,
      v_profile.total_xp,
      v_profile.gold_balance,
      v_profile.unspent_skill_points,
      v_profile.skill_ranks,
      v_profile.economy_version,
      v_profile.imported_local_rewards_at,
      v_profile.updated_at
    )
  );

  insert into public.primary_reward_events (
    student_id, event_id, reward_kind, activity_id, source,
    base_xp, base_gold, xp_bonus, gold_bonus, level_gold,
    skill_points_delta, levels_gained, metadata, receipt
  ) values (
    v_student_id, v_event_id, v_kind, nullif(trim(coalesce(p_activity_id, '')), ''), v_source,
    v_base_xp, v_base_gold, v_xp_bonus, v_gold_bonus, v_level_gold,
    v_skill_points, v_levels, p_metadata, v_receipt
  );

  return v_receipt;
end;
$$;

create or replace function public.import_primary_local_rewards(
  p_total_xp bigint,
  p_gold_balance bigint,
  p_unspent_skill_points integer,
  p_skill_ranks jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_profile public.primary_player_profiles%rowtype;
  v_ranks jsonb;
  v_updated_at timestamptz := now();
  v_receipt jsonb;
begin
  if v_student_id is null or not public.is_student() then
    raise exception 'student authentication required';
  end if;

  insert into public.primary_player_profiles (student_id)
  values (v_student_id)
  on conflict (student_id) do nothing;

  select * into v_profile
  from public.primary_player_profiles
  where student_id = v_student_id
  for update;

  if v_profile.imported_local_rewards_at is not null then
    return jsonb_build_object(
      'eventId', 'local-import-v1',
      'duplicate', true,
      'profile', public.primary_player_profile_json(
        v_profile.student_id, v_profile.total_xp, v_profile.gold_balance,
        v_profile.unspent_skill_points, v_profile.skill_ranks,
        v_profile.economy_version, v_profile.imported_local_rewards_at,
        v_profile.updated_at
      )
    );
  end if;

  v_ranks := jsonb_build_object(
    'activity_xp', greatest(0, least(5, coalesce((p_skill_ranks ->> 'activity_xp')::integer, 0))),
    'activity_gold', greatest(0, least(5, coalesce((p_skill_ranks ->> 'activity_gold')::integer, 0)))
  );

  update public.primary_player_profiles
  set total_xp = greatest(total_xp, greatest(0, least(coalesce(p_total_xp, 0), 10000000))),
      gold_balance = greatest(gold_balance, greatest(0, least(coalesce(p_gold_balance, 0), 10000000))),
      unspent_skill_points = greatest(
        unspent_skill_points,
        greatest(0, least(coalesce(p_unspent_skill_points, 0), 1000))
      ),
      skill_ranks = jsonb_build_object(
        'activity_xp', greatest(
          coalesce((skill_ranks ->> 'activity_xp')::integer, 0),
          coalesce((v_ranks ->> 'activity_xp')::integer, 0)
        ),
        'activity_gold', greatest(
          coalesce((skill_ranks ->> 'activity_gold')::integer, 0),
          coalesce((v_ranks ->> 'activity_gold')::integer, 0)
        )
      ),
      economy_version = 2,
      imported_local_rewards_at = v_updated_at,
      updated_at = v_updated_at
  where student_id = v_student_id
  returning * into v_profile;

  v_receipt := jsonb_build_object(
    'eventId', 'local-import-v1',
    'rewardKind', 'local_import',
    'duplicate', false,
    'profile', public.primary_player_profile_json(
      v_profile.student_id, v_profile.total_xp, v_profile.gold_balance,
      v_profile.unspent_skill_points, v_profile.skill_ranks,
      v_profile.economy_version, v_profile.imported_local_rewards_at,
      v_profile.updated_at
    )
  );

  insert into public.primary_reward_events (
    student_id, event_id, reward_kind, source, metadata, receipt
  ) values (
    v_student_id, 'local-import-v1', 'local_import', 'migration',
    jsonb_build_object('economyVersion', 1), v_receipt
  ) on conflict (student_id, event_id) do nothing;

  return v_receipt;
end;
$$;

create or replace function public.purchase_primary_skill(p_skill_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_skill_id text := lower(trim(coalesce(p_skill_id, '')));
  v_profile public.primary_player_profiles%rowtype;
  v_rank integer;
  v_updated_at timestamptz := now();
begin
  if v_student_id is null or not public.is_student() then
    raise exception 'student authentication required';
  end if;
  if v_skill_id not in ('activity_xp', 'activity_gold') then
    raise exception 'unsupported primary skill';
  end if;

  insert into public.primary_player_profiles (student_id)
  values (v_student_id)
  on conflict (student_id) do nothing;

  select * into v_profile
  from public.primary_player_profiles
  where student_id = v_student_id
  for update;

  v_rank := greatest(0, least(5, coalesce((v_profile.skill_ranks ->> v_skill_id)::integer, 0)));
  if v_rank >= 5 then raise exception 'skill already at maximum rank'; end if;
  if v_profile.unspent_skill_points < 1 then raise exception 'not enough skill points'; end if;

  update public.primary_player_profiles
  set skill_ranks = jsonb_set(skill_ranks, array[v_skill_id], to_jsonb(v_rank + 1), true),
      unspent_skill_points = unspent_skill_points - 1,
      updated_at = v_updated_at
  where student_id = v_student_id
  returning * into v_profile;

  return jsonb_build_object(
    'skillId', v_skill_id,
    'newRank', v_rank + 1,
    'profile', public.primary_player_profile_json(
      v_profile.student_id, v_profile.total_xp, v_profile.gold_balance,
      v_profile.unspent_skill_points, v_profile.skill_ranks,
      v_profile.economy_version, v_profile.imported_local_rewards_at,
      v_profile.updated_at
    )
  );
end;
$$;

revoke all on function public.primary_player_snapshot() from public;
revoke all on function public.apply_primary_reward(text, text, text, text, jsonb) from public;
revoke all on function public.import_primary_local_rewards(bigint, bigint, integer, jsonb) from public;
revoke all on function public.purchase_primary_skill(text) from public;

grant execute on function public.primary_player_snapshot() to authenticated;
grant execute on function public.apply_primary_reward(text, text, text, text, jsonb) to authenticated;
grant execute on function public.import_primary_local_rewards(bigint, bigint, integer, jsonb) to authenticated;
grant execute on function public.purchase_primary_skill(text) to authenticated;
grant execute on function public.primary_xp_required_for_level(integer) to authenticated;
grant execute on function public.primary_level_from_xp(bigint) to authenticated;
