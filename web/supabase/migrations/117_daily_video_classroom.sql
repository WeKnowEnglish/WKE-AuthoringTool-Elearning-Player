-- Phase 1 Daily video: room metadata on class_sessions + provisional attendance.
-- Transcript metadata tables intentionally deferred to Phase 2 (webhook + storage workflow).
-- Browser join/leave attendance is provisional pilot data until Daily webhooks are verified.

alter table public.class_sessions
  add column if not exists daily_room_name text,
  add column if not exists daily_room_url text,
  add column if not exists daily_room_created_at timestamptz,
  add column if not exists daily_room_expires_at timestamptz,
  add column if not exists transcription_enabled boolean not null default false,
  add column if not exists recording_enabled boolean not null default false;

comment on column public.class_sessions.daily_room_name is
  'Opaque Daily private room name for this Virtual Classroom session.';
comment on column public.class_sessions.transcription_enabled is
  'Reserved for Phase 2; must stay false until transcript workflow ships.';
comment on column public.class_sessions.recording_enabled is
  'Reserved; recording stays off by default and separate from transcription.';

create unique index if not exists class_sessions_daily_room_name_uidx
  on public.class_sessions (daily_room_name)
  where daily_room_name is not null;

create table if not exists public.class_session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.class_sessions (id) on delete cascade,
  -- Auth user when known; null for one-off guests (participant_key holds guest-*).
  user_id uuid references auth.users (id) on delete cascade,
  participant_key text not null,
  daily_participant_id text,
  role text not null
    check (role in ('teacher', 'student', 'guest')),
  first_joined_at timestamptz not null default now(),
  last_left_at timestamptz,
  total_seconds integer not null default 0
    check (total_seconds >= 0),
  join_count integer not null default 1
    check (join_count >= 0),
  -- provisional = browser-reported pilot events; verified = webhook-confirmed (Phase 2+)
  source text not null default 'provisional'
    check (source in ('provisional', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_session_attendance_session_participant_unique
    unique (session_id, participant_key),
  constraint class_session_attendance_participant_key_len
    check (char_length(trim(participant_key)) between 1 and 80)
);

create index if not exists class_session_attendance_session_idx
  on public.class_session_attendance (session_id, first_joined_at desc);

comment on table public.class_session_attendance is
  'Join/leave tracking for Virtual Classroom video. Phase 1 browser events are provisional only.';

alter table public.class_session_attendance enable row level security;

grant select on public.class_session_attendance to authenticated;
-- Writes go through service-role server routes; no direct client inserts.

drop policy if exists class_session_attendance_teacher_select on public.class_session_attendance;
create policy class_session_attendance_teacher_select
  on public.class_session_attendance for select to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.class_sessions cs
      where cs.id = class_session_attendance.session_id
        and (
          cs.created_by = auth.uid()::text
          or (
            cs.class_id is not null
            and exists (
              select 1
              from public.teacher_classes tc
              where tc.id = cs.class_id
                and tc.teacher_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists class_session_attendance_own_select on public.class_session_attendance;
create policy class_session_attendance_own_select
  on public.class_session_attendance for select to authenticated
  using (user_id = auth.uid());
