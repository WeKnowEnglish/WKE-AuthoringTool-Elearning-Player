-- Central, privacy-limited product diagnostics for authenticated platform sessions.
-- Raw events are short-lived operational data; learning evidence remains authoritative
-- for assessment and mastery.

create table if not exists public.platform_usage_events (
  event_id text primary key,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'admin', 'unknown')),
  session_id text not null,
  device_id text not null,
  surface text not null check (surface in ('student', 'teacher', 'lesson', 'live-game', 'admin')),
  phase text not null,
  event_name text not null,
  event_kind text not null check (event_kind in ('mark', 'span', 'error', 'vital')),
  duration_ms double precision check (duration_ms is null or duration_ms >= 0),
  route text,
  class_id uuid references public.teacher_classes (id) on delete set null,
  activity_id text,
  homework_id uuid references public.class_homework (id) on delete set null,
  status text,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  app_version text,
  device_category text check (device_category is null or device_category in ('mobile', 'tablet', 'desktop', 'unknown')),
  constraint platform_usage_event_id_len check (char_length(event_id) between 8 and 160),
  constraint platform_usage_session_id_len check (char_length(session_id) between 3 and 160),
  constraint platform_usage_device_id_len check (char_length(device_id) between 3 and 160),
  constraint platform_usage_phase_len check (char_length(phase) between 1 and 80),
  constraint platform_usage_name_len check (char_length(event_name) between 1 and 120)
);

create index if not exists platform_usage_events_time_idx
  on public.platform_usage_events (occurred_at desc);
create index if not exists platform_usage_events_user_time_idx
  on public.platform_usage_events (user_id, occurred_at desc);
create index if not exists platform_usage_events_session_time_idx
  on public.platform_usage_events (session_id, occurred_at asc);
create index if not exists platform_usage_events_class_time_idx
  on public.platform_usage_events (class_id, occurred_at desc)
  where class_id is not null;
create index if not exists platform_usage_events_error_time_idx
  on public.platform_usage_events (occurred_at desc)
  where event_kind = 'error';

alter table public.platform_usage_events enable row level security;
revoke all on public.platform_usage_events from public, anon, authenticated;
grant all on public.platform_usage_events to service_role;

comment on table public.platform_usage_events is
  'Short-lived operational diagnostics. Delete raw rows after 60 days; retain only anonymous aggregates longer.';

