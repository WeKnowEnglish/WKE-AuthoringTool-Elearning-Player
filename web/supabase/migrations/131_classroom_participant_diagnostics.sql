-- Associate operational diagnostics with a Virtual Classroom and allow
-- session-cookie guests to contribute measurements without an auth.users row.

alter table public.platform_usage_events
  alter column user_id drop not null;

alter table public.platform_usage_events
  add column if not exists classroom_session_id text
    references public.class_sessions (id) on delete cascade,
  add column if not exists participant_id text,
  add column if not exists participant_display_name text;

create index if not exists platform_usage_events_classroom_time_idx
  on public.platform_usage_events (classroom_session_id, occurred_at asc)
  where classroom_session_id is not null;

comment on column public.platform_usage_events.classroom_session_id is
  'Virtual Classroom session used for teacher-scoped multi-participant diagnostics.';
comment on column public.platform_usage_events.participant_id is
  'Session participant identity; may represent a signed-in user or a one-off guest.';

