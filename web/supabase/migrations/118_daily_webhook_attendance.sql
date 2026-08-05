-- Phase 2a: idempotent Daily webhook event log for verified attendance.
-- No transcript tables yet.

create table if not exists public.daily_webhook_events (
  event_id text primary key,
  event_type text not null,
  room_name text,
  session_id text references public.class_sessions (id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'processed'
    check (status in ('processed', 'ignored', 'error')),
  error_message text
);

create index if not exists daily_webhook_events_received_idx
  on public.daily_webhook_events (received_at desc);

comment on table public.daily_webhook_events is
  'Idempotency log for Daily webhook deliveries (participant join/leave, etc.).';

alter table public.daily_webhook_events enable row level security;
-- Service-role writes only; no authenticated client access.

comment on table public.class_session_attendance is
  'Join/leave tracking for Virtual Classroom video. Browser events are provisional; Daily webhooks set source=verified.';
