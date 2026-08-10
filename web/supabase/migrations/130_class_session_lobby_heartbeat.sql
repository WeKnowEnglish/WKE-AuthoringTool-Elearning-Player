-- Durable active-lobby registry for the Virtual Classroom migration.
-- A missing browser "leave" must not keep a departed learner in a teacher tool.

alter table public.class_session_attendance
  add column if not exists lobby_last_seen_at timestamptz;

comment on column public.class_session_attendance.lobby_last_seen_at is
  'Most recent authenticated browser heartbeat while the participant is in the classroom app.';
