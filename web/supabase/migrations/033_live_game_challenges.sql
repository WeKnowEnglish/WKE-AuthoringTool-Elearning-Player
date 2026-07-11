-- Durable, server-owned live-game challenge lifecycle.

create table public.live_game_challenges (
  id text primary key,
  room_id text not null,
  player_id text not null,
  node_id text not null,
  question_id text not null,
  status text not null default 'active',
  expires_at timestamptz not null,
  claim_started_at timestamptz,
  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_game_challenges_id_format check (id ~ '^ch_[0-9a-f]{24}$'),
  constraint live_game_challenges_room_len check (char_length(room_id) between 1 and 128),
  constraint live_game_challenges_player_len check (char_length(player_id) between 1 and 128),
  constraint live_game_challenges_status_check
    check (status in ('active', 'awarding', 'awarded', 'expired'))
);

create unique index live_game_challenges_open_node_idx
  on public.live_game_challenges (room_id, player_id, node_id)
  where status in ('active', 'awarding');

create index live_game_challenges_expiry_idx
  on public.live_game_challenges (expires_at)
  where status in ('active', 'awarding');

alter table public.live_game_challenges enable row level security;

-- No anon/authenticated grants or policies: only the service-role server client
-- may read or mutate challenge tokens and lifecycle state.
revoke all on public.live_game_challenges from anon, authenticated;
