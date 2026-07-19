-- Whiteboard P2: class sessions, durable boards, feedback, audit, retention fields.

create table if not exists public.class_sessions (
  id text primary key,
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  title text not null default 'Class session',
  status text not null default 'active',
  created_by text not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists class_sessions_class_idx
  on public.class_sessions (class_id, created_at desc);

alter table public.whiteboard_rounds
  add column if not exists class_id uuid references public.teacher_classes (id) on delete set null,
  add column if not exists session_id text references public.class_sessions (id) on delete set null,
  add column if not exists activity_id text,
  add column if not exists archived_at timestamptz,
  add column if not exists retention_until timestamptz,
  add column if not exists group_submit_policy text not null default 'any_member';

alter table public.whiteboard_submissions
  add column if not exists preview_path text,
  add column if not exists export_png_path text,
  add column if not exists export_svg_path text;

create table if not exists public.whiteboard_boards (
  id text primary key,
  round_id text not null references public.whiteboard_rounds (id) on delete cascade,
  owner_type text not null,
  owner_id text not null,
  current_revision integer not null default 1,
  status text not null default 'WAITING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whiteboard_boards_round_idx
  on public.whiteboard_boards (round_id);

create table if not exists public.whiteboard_board_members (
  board_id text not null references public.whiteboard_boards (id) on delete cascade,
  user_id text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table if not exists public.whiteboard_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null references public.whiteboard_submissions (id) on delete cascade,
  teacher_id text not null,
  feedback_type text not null default 'note',
  message text not null default '',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whiteboard_feedback_submission_idx
  on public.whiteboard_feedback (submission_id, created_at desc);

create table if not exists public.whiteboard_audit_events (
  id uuid primary key default gen_random_uuid(),
  round_id text not null,
  actor_id text,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whiteboard_audit_round_idx
  on public.whiteboard_audit_events (round_id, created_at desc);

create table if not exists public.whiteboard_awards (
  id text primary key,
  round_id text not null,
  student_id text not null,
  teacher_id text not null,
  reward_type text not null default 'star',
  gold_delta integer not null default 5,
  experience_delta integer not null default 10,
  created_at timestamptz not null default now()
);

create index if not exists whiteboard_awards_student_idx
  on public.whiteboard_awards (student_id, created_at desc);

alter table public.class_sessions enable row level security;
alter table public.whiteboard_boards enable row level security;
alter table public.whiteboard_board_members enable row level security;
alter table public.whiteboard_feedback enable row level security;
alter table public.whiteboard_audit_events enable row level security;
alter table public.whiteboard_awards enable row level security;

revoke all on public.class_sessions from public, anon, authenticated;
revoke all on public.whiteboard_boards from public, anon, authenticated;
revoke all on public.whiteboard_board_members from public, anon, authenticated;
revoke all on public.whiteboard_feedback from public, anon, authenticated;
revoke all on public.whiteboard_audit_events from public, anon, authenticated;
revoke all on public.whiteboard_awards from public, anon, authenticated;

grant all on public.class_sessions to service_role;
grant all on public.whiteboard_boards to service_role;
grant all on public.whiteboard_board_members to service_role;
grant all on public.whiteboard_feedback to service_role;
grant all on public.whiteboard_audit_events to service_role;
grant all on public.whiteboard_awards to service_role;
