-- Teacher-owned activity track builder drafts (practice / graded / assessment).
-- Replaces browser-only localStorage so drafts follow the teacher across devices and deploys.

create table if not exists public.activity_track_drafts (
  id uuid primary key,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  mode text not null
    check (mode in ('practice', 'graded', 'assessment')),
  title text not null,
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_track_drafts_title_len
    check (char_length(trim(title)) between 1 and 200),
  constraint activity_track_drafts_document_is_object
    check (jsonb_typeof(document) = 'object')
);

create index if not exists activity_track_drafts_teacher_updated_idx
  on public.activity_track_drafts (teacher_id, updated_at desc);

alter table public.activity_track_drafts enable row level security;

grant select, insert, update, delete on public.activity_track_drafts to authenticated;

drop policy if exists activity_track_drafts_owner_select on public.activity_track_drafts;
create policy activity_track_drafts_owner_select
  on public.activity_track_drafts for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists activity_track_drafts_owner_insert on public.activity_track_drafts;
create policy activity_track_drafts_owner_insert
  on public.activity_track_drafts for insert
  to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists activity_track_drafts_owner_update on public.activity_track_drafts;
create policy activity_track_drafts_owner_update
  on public.activity_track_drafts for update
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists activity_track_drafts_owner_delete on public.activity_track_drafts;
create policy activity_track_drafts_owner_delete
  on public.activity_track_drafts for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

comment on table public.activity_track_drafts is
  'Activity Builder track drafts (Practice / Graded / Assessment). Autosaved server-side per teacher.';

comment on column public.activity_track_drafts.document is
  'Full ActivityTrackDocument JSON (version 1). id column mirrors document.id.';
