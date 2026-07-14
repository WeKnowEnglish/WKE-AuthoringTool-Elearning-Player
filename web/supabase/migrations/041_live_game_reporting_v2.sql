-- Reporting V2 for the current multi-round English Craft environment.
-- Detailed evidence remains server-only; report routes enforce player identity.

-- A quarantined pre-V2 implementation used this table name with session_id and
-- student_id columns. Preserve that data before creating the current encounter-
-- based table. The guard is a no-op on clean databases and after a completed
-- recovery.
do $$
begin
  if to_regclass('public.live_game_question_attempts') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'live_game_question_attempts'
        and column_name = 'session_id'
    )
    and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'live_game_question_attempts'
        and column_name = 'encounter_id'
    )
  then
    if to_regclass('public.live_game_question_attempts_legacy_20260714') is not null then
      raise exception 'Legacy Live Game attempts backup already exists; inspect both tables before continuing';
    end if;

    alter table public.live_game_question_attempts
      rename to live_game_question_attempts_legacy_20260714;

    if exists (
      select 1 from pg_constraint
      where conrelid = 'public.live_game_question_attempts_legacy_20260714'::regclass
        and conname = 'live_game_question_attempts_pkey'
    ) then
      alter table public.live_game_question_attempts_legacy_20260714
        rename constraint live_game_question_attempts_pkey
        to live_game_question_attempts_legacy_20260714_pkey;
    end if;

    if exists (
      select 1 from pg_constraint
      where conrelid = 'public.live_game_question_attempts_legacy_20260714'::regclass
        and conname = 'live_game_attempt_submission_unique'
    ) then
      alter table public.live_game_question_attempts_legacy_20260714
        rename constraint live_game_attempt_submission_unique
        to live_game_attempt_legacy_submission_unique;
    end if;

    alter index if exists public.live_game_attempts_student_session_idx
      rename to live_game_attempts_legacy_student_session_idx;
    alter index if exists public.live_game_attempts_session_idx
      rename to live_game_attempts_legacy_session_idx;
  end if;
end;
$$;

create table public.live_game_report_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  join_code text not null,
  round_number integer not null check (round_number >= 1),
  host_user_id uuid references auth.users (id) on delete set null,
  mode_id text not null,
  map_id text not null,
  question_set_id uuid references public.live_game_question_sets (id) on delete set null,
  question_set_version integer not null check (question_set_version >= 1),
  question_set_title text not null,
  level text not null,
  topic text not null,
  learning_objective text not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 60),
  status text not null default 'active' check (status in ('active', 'completed')),
  end_reason text check (end_reason is null or end_reason in ('objective_completed', 'timeout', 'host_ended_early')),
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (room_id, round_number)
);

create unique index live_game_report_rounds_active_room_idx
  on public.live_game_report_rounds (room_id) where status = 'active';
create index live_game_report_rounds_room_ended_idx
  on public.live_game_report_rounds (room_id, ended_at desc);

create table public.live_game_report_participants (
  round_id uuid not null references public.live_game_report_rounds (id) on delete cascade,
  player_id text not null,
  account_user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  role text not null check (role in ('host', 'player')),
  joined_at timestamptz not null default now(),
  primary key (round_id, player_id)
);

create table public.live_game_question_encounters (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.live_game_report_rounds (id) on delete cascade,
  challenge_id text not null unique references public.live_game_challenges (id) on delete cascade,
  player_id text not null,
  question_id text not null,
  question_set_id uuid references public.live_game_question_sets (id) on delete set null,
  question_set_version integer not null,
  question_bank text not null check (question_bank in ('harvest', 'deposit', 'craft')),
  question_type text not null check (question_type in ('multiple_choice', 'deposit_spell', 'drag_sentence')),
  question_prompt text not null,
  correct_answer jsonb not null,
  learning_target_key text not null,
  learning_target_label text not null,
  cefr_level text,
  game_action_type text not null check (game_action_type in ('harvest', 'deposit', 'craft')),
  game_object_id text not null,
  resource_type text,
  recipe_id text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text not null default 'open'
    check (resolution in ('open', 'correct', 'unresolved', 'skipped', 'expired', 'abandoned')),
  system_hints_used integer not null default 0 check (system_hints_used >= 0),
  teacher_support_level integer not null default 0 check (teacher_support_level between 0 and 5),
  help_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index live_game_encounters_round_player_idx
  on public.live_game_question_encounters (round_id, player_id, opened_at);
create index live_game_encounters_round_target_idx
  on public.live_game_question_encounters (round_id, learning_target_key);

create table public.live_game_question_attempts (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.live_game_question_encounters (id) on delete cascade,
  submission_id uuid not null,
  submission_index integer not null check (submission_index >= 1),
  selected_answer jsonb not null,
  is_correct boolean not null,
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  contribution jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (encounter_id, submission_id),
  unique (encounter_id, submission_index)
);

create index live_game_attempts_encounter_time_idx
  on public.live_game_question_attempts (encounter_id, submitted_at);

create table public.live_game_support_events (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.live_game_question_encounters (id) on delete cascade,
  event_type text not null check (event_type in ('help_requested', 'system_hint', 'teacher_hint')),
  support_level integer not null default 0 check (support_level between 0 and 5),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.live_game_report_rounds enable row level security;
alter table public.live_game_report_participants enable row level security;
alter table public.live_game_question_encounters enable row level security;
alter table public.live_game_question_attempts enable row level security;
alter table public.live_game_support_events enable row level security;

revoke all on public.live_game_report_rounds from anon, authenticated;
revoke all on public.live_game_report_participants from anon, authenticated;
revoke all on public.live_game_question_encounters from anon, authenticated;
revoke all on public.live_game_question_attempts from anon, authenticated;
revoke all on public.live_game_support_events from anon, authenticated;
