-- VirtualClassroom session fields on class_sessions.

alter table public.class_sessions
  add column if not exists join_code text,
  add column if not exists liveblocks_room_id text;

create unique index if not exists class_sessions_join_code_active_uidx
  on public.class_sessions (join_code)
  where status = 'active' and join_code is not null;

comment on column public.class_sessions.join_code is
  'Public VirtualClassroom join code (6 chars) while session is active.';
comment on column public.class_sessions.liveblocks_room_id is
  'Liveblocks room for session presence/tools (wke-vc-session-*).';
