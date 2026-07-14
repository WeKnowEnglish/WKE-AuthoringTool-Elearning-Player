-- Private, short-lived performance evidence for teacher-exported Live Game diagnostics.
-- No client role receives table access; all reads/writes pass through authorized API routes.

create table if not exists public.live_game_diagnostic_events (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  event_id text not null,
  trace_id text not null,
  device_id text not null,
  event_at timestamptz not null,
  phase text not null,
  event_name text not null,
  event_kind text not null,
  duration_ms double precision,
  player_role text,
  display_name text,
  detail jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  constraint live_game_diagnostic_event_kind_check
    check (event_kind in ('mark', 'span', 'error')),
  constraint live_game_diagnostic_player_role_check
    check (player_role is null or player_role in ('host', 'player')),
  unique (room_id, device_id, event_id)
);

create index if not exists live_game_diagnostic_events_room_time_idx
  on public.live_game_diagnostic_events (room_id, event_at);

create index if not exists live_game_diagnostic_events_captured_at_idx
  on public.live_game_diagnostic_events (captured_at);

alter table public.live_game_diagnostic_events enable row level security;
revoke all on table public.live_game_diagnostic_events from public, anon, authenticated;
