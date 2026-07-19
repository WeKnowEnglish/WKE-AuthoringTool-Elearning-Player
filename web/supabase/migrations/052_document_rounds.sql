-- Document activity thin rounds (VirtualClassroom Phase 2 Chunk 1).
-- Service-role writes from Next.js APIs; no anon/authenticated access.

create table if not exists public.document_rounds (
  id text primary key,
  session_id text not null references public.class_sessions (id) on delete cascade,
  liveblocks_room_id text not null,
  created_by text not null,
  participation_mode text not null default 'individual',
  template_type text not null default 'paragraph',
  phase text not null default 'waiting',
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opened_at timestamptz,
  collected_at timestamptz,
  completed_at timestamptz
);

create index if not exists document_rounds_session_idx
  on public.document_rounds (session_id, created_at desc);

create index if not exists document_rounds_host_idx
  on public.document_rounds (created_by, created_at desc);

alter table public.document_rounds enable row level security;

revoke all on public.document_rounds from public, anon, authenticated;

grant all on public.document_rounds to service_role;
