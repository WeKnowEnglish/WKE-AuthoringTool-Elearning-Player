-- Word cards activity thin rounds (VirtualClassroom WC-1).
-- Service-role writes from Next.js APIs; no anon/authenticated access.

create table if not exists public.word_card_rounds (
  id text primary key,
  session_id text not null references public.class_sessions (id) on delete cascade,
  join_code text not null unique,
  liveblocks_room_id text not null,
  created_by text not null,
  participation_mode text not null default 'individual',
  phase text not null default 'waiting',
  word_list_json jsonb not null default '[]'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opened_at timestamptz,
  collected_at timestamptz,
  completed_at timestamptz
);

create index if not exists word_card_rounds_session_idx
  on public.word_card_rounds (session_id, created_at desc);

create index if not exists word_card_rounds_host_idx
  on public.word_card_rounds (created_by, created_at desc);

alter table public.word_card_rounds enable row level security;

revoke all on public.word_card_rounds from public, anon, authenticated;

grant all on public.word_card_rounds to service_role;
