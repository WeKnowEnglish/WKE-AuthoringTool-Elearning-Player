-- Phase 3a: Daily session transcripts (metadata + private storage).
-- Real-time captions remain Daily-side; we persist WebVTT after ready-to-download.

create table if not exists public.class_session_transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.class_sessions (id) on delete cascade,
  daily_transcript_id text,
  daily_room_name text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed', 'expired')),
  language text not null default 'en',
  storage_bucket text,
  storage_path text,
  duration_seconds numeric,
  error_message text,
  started_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists class_session_transcripts_session_idx
  on public.class_session_transcripts (session_id, created_at desc);

create unique index if not exists class_session_transcripts_daily_id_uidx
  on public.class_session_transcripts (daily_transcript_id)
  where daily_transcript_id is not null;

comment on table public.class_session_transcripts is
  'Daily real-time transcription jobs persisted to private Storage as WebVTT.';

alter table public.class_session_transcripts enable row level security;

grant select on public.class_session_transcripts to authenticated;

drop policy if exists class_session_transcripts_teacher_select on public.class_session_transcripts;
create policy class_session_transcripts_teacher_select
  on public.class_session_transcripts for select to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.class_sessions cs
      where cs.id = class_session_transcripts.session_id
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

-- Private bucket; reads go through service-role signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vc_transcripts',
  'vc_transcripts',
  false,
  26214400,
  array['text/vtt', 'text/plain', 'application/json']
)
on conflict (id) do nothing;

comment on column public.class_sessions.transcription_enabled is
  'True while host has opted into Daily real-time transcription for this session.';
