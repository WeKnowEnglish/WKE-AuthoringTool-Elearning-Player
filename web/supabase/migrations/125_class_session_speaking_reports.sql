-- Procedural speaking reports from VC transcripts (teacher approval before official).

create table if not exists public.class_session_speaking_reports (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.class_sessions (id) on delete cascade,
  class_id uuid references public.teacher_classes (id) on delete set null,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  source_transcript_id uuid references public.class_session_transcripts (id) on delete set null,
  status text not null default 'ready_for_review'
    check (status in ('draft', 'ready_for_review', 'approved', 'discarded')),
  snapshot jsonb not null,
  generation_method text not null default 'heuristic'
    check (generation_method in ('heuristic', 'llm')),
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  discarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_session_speaking_reports_snapshot_object
    check (jsonb_typeof(snapshot) = 'object'),
  constraint class_session_speaking_reports_snapshot_version
    check (snapshot ->> 'schemaVersion' = '1')
);

create index if not exists class_session_speaking_reports_session_idx
  on public.class_session_speaking_reports (session_id, created_at desc);

create unique index if not exists class_session_speaking_reports_working_uidx
  on public.class_session_speaking_reports (session_id)
  where status in ('draft', 'ready_for_review');

create index if not exists class_session_speaking_reports_class_approved_idx
  on public.class_session_speaking_reports (class_id, approved_at desc)
  where status = 'approved';

comment on table public.class_session_speaking_reports is
  'Teacher-reviewed speaking summaries generated from Daily VC transcripts.';

alter table public.class_session_speaking_reports enable row level security;

grant select, update on public.class_session_speaking_reports to authenticated;

drop policy if exists class_session_speaking_reports_teacher_select
  on public.class_session_speaking_reports;
create policy class_session_speaking_reports_teacher_select
  on public.class_session_speaking_reports for select to authenticated
  using (
    public.is_teacher()
    and (
      teacher_id = auth.uid()
      or (
        class_id is not null
        and exists (
          select 1
          from public.teacher_classes tc
          where tc.id = class_session_speaking_reports.class_id
            and tc.teacher_id = auth.uid()
            and tc.archived_at is null
        )
      )
      or exists (
        select 1
        from public.class_sessions cs
        where cs.id = class_session_speaking_reports.session_id
          and cs.created_by = auth.uid()::text
      )
    )
  );

drop policy if exists class_session_speaking_reports_teacher_update
  on public.class_session_speaking_reports;
create policy class_session_speaking_reports_teacher_update
  on public.class_session_speaking_reports for update to authenticated
  using (
    public.is_teacher()
    and (
      teacher_id = auth.uid()
      or (
        class_id is not null
        and exists (
          select 1
          from public.teacher_classes tc
          where tc.id = class_session_speaking_reports.class_id
            and tc.teacher_id = auth.uid()
            and tc.archived_at is null
        )
      )
      or exists (
        select 1
        from public.class_sessions cs
        where cs.id = class_session_speaking_reports.session_id
          and cs.created_by = auth.uid()::text
      )
    )
  )
  with check (
    public.is_teacher()
    and (
      teacher_id = auth.uid()
      or (
        class_id is not null
        and exists (
          select 1
          from public.teacher_classes tc
          where tc.id = class_session_speaking_reports.class_id
            and tc.teacher_id = auth.uid()
            and tc.archived_at is null
        )
      )
      or exists (
        select 1
        from public.class_sessions cs
        where cs.id = class_session_speaking_reports.session_id
          and cs.created_by = auth.uid()::text
      )
    )
  );
