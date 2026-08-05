-- Phase 3b: Daily cloud recordings (metadata + private storage).
-- Opt-in only; separate from transcription.

create table if not exists public.class_session_recordings (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.class_sessions (id) on delete cascade,
  daily_recording_id text,
  daily_room_name text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed', 'expired')),
  storage_bucket text,
  storage_path text,
  content_type text,
  duration_seconds numeric,
  size_bytes bigint,
  error_message text,
  started_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists class_session_recordings_session_idx
  on public.class_session_recordings (session_id, created_at desc);

create unique index if not exists class_session_recordings_daily_id_uidx
  on public.class_session_recordings (daily_recording_id)
  where daily_recording_id is not null;

comment on table public.class_session_recordings is
  'Daily cloud recordings persisted to private Storage for teacher replay.';

alter table public.class_session_recordings enable row level security;

grant select on public.class_session_recordings to authenticated;

drop policy if exists class_session_recordings_teacher_select on public.class_session_recordings;
create policy class_session_recordings_teacher_select
  on public.class_session_recordings for select to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.class_sessions cs
      where cs.id = class_session_recordings.session_id
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vc_recordings',
  'vc_recordings',
  false,
  524288000,
  array['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4', 'application/octet-stream']
)
on conflict (id) do nothing;

comment on column public.class_sessions.recording_enabled is
  'True while host has opted into Daily cloud recording for this session.';
