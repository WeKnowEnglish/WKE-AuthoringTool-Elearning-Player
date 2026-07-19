-- Collaborative whiteboard durable rounds, submissions, templates (P1).
-- Service-role writes from Next.js APIs; no anon/authenticated access.

create table if not exists public.whiteboard_rounds (
  id text primary key,
  liveblocks_room_id text not null,
  join_code text not null,
  host_user_id text not null,
  phase text not null default 'WAITING',
  mode text not null default 'individual',
  prompt_json jsonb not null default '{}'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  background_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opened_at timestamptz,
  collected_at timestamptz,
  ended_at timestamptz
);

create index if not exists whiteboard_rounds_host_idx
  on public.whiteboard_rounds (host_user_id, created_at desc);

create table if not exists public.whiteboard_submissions (
  id text primary key,
  round_id text not null references public.whiteboard_rounds (id) on delete cascade,
  liveblocks_room_id text not null,
  board_id text not null,
  owner_type text not null,
  owner_id text not null,
  contributor_ids text[] not null default '{}',
  revision integer not null,
  submission_type text not null,
  document_json jsonb not null,
  preview_data_url text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  returned_at timestamptz,
  unique (round_id, board_id, revision)
);

create index if not exists whiteboard_submissions_round_idx
  on public.whiteboard_submissions (round_id, submitted_at desc);

create table if not exists public.whiteboard_templates (
  id uuid primary key default gen_random_uuid(),
  host_user_id text not null,
  title text not null,
  instructions text not null default '',
  mode text not null default 'individual',
  timer_minutes integer not null default 4,
  background_json jsonb not null default '{}'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  stamp_pack_id text not null default 'default',
  created_at timestamptz not null default now()
);

create index if not exists whiteboard_templates_host_idx
  on public.whiteboard_templates (host_user_id, created_at desc);

alter table public.whiteboard_rounds enable row level security;
alter table public.whiteboard_submissions enable row level security;
alter table public.whiteboard_templates enable row level security;

revoke all on public.whiteboard_rounds from public, anon, authenticated;
revoke all on public.whiteboard_submissions from public, anon, authenticated;
revoke all on public.whiteboard_templates from public, anon, authenticated;

grant all on public.whiteboard_rounds to service_role;
grant all on public.whiteboard_submissions to service_role;
grant all on public.whiteboard_templates to service_role;
