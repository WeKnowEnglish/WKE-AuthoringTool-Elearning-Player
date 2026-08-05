-- Wave 2: waiting-room lobby presence on class_session_attendance (video fields unchanged).

alter table public.class_session_attendance
  add column if not exists lobby_first_joined_at timestamptz,
  add column if not exists lobby_last_left_at timestamptz,
  add column if not exists lobby_join_count integer not null default 0
    check (lobby_join_count >= 0);

comment on column public.class_session_attendance.lobby_first_joined_at is
  'First app waiting-room check-in for this participant (T-15 lobby).';
comment on column public.class_session_attendance.lobby_last_left_at is
  'Last lobby leave; null while still in waiting room.';
