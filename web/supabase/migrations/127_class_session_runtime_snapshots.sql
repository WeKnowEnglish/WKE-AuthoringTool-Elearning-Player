-- Versioned recovery snapshot for the Virtual Classroom control plane.
-- Liveblocks remains the active UI transport during the migration; this table
-- is intentionally server-owned and is not exposed directly to browsers.

create table if not exists public.class_session_runtime_snapshots (
  session_id text primary key references public.class_sessions (id) on delete cascade,
  state_version bigint not null default 1 check (state_version >= 1),
  snapshot_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null
);

comment on table public.class_session_runtime_snapshots is
  'Authoritative, versioned Virtual Classroom control-plane snapshot used for reconnect recovery.';
comment on column public.class_session_runtime_snapshots.state_version is
  'Monotonic version. Clients discard durable broadcast events at or below their loaded version.';

alter table public.class_session_runtime_snapshots enable row level security;

revoke all on public.class_session_runtime_snapshots from public, anon, authenticated;
grant all on public.class_session_runtime_snapshots to service_role;
