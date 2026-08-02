-- Parent Portal Phase 3: teacher-reviewed, versioned progress report snapshots.

create table if not exists public.parent_progress_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  version int not null check (version > 0),
  status text not null default 'draft'
    check (status in ('draft', 'ready_for_review', 'published', 'archived')),
  period_start date not null,
  period_end date not null,
  snapshot jsonb not null,
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_progress_reports_period_order check (period_end >= period_start),
  constraint parent_progress_reports_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint parent_progress_reports_snapshot_version check (snapshot ->> 'schemaVersion' = '1'),
  unique(student_id, version)
);

create index if not exists parent_progress_reports_student_published_idx
  on public.parent_progress_reports(student_id, published_at desc)
  where status = 'published';

create index if not exists parent_progress_reports_teacher_student_idx
  on public.parent_progress_reports(teacher_id, student_id, version desc);

alter table public.parent_progress_reports enable row level security;

create policy parent_progress_reports_teacher_select
  on public.parent_progress_reports for select to authenticated
  using (
    teacher_id = auth.uid()
    and public.is_teacher()
    and exists (
      select 1
      from public.teacher_classes tc
      join public.class_enrollments ce on ce.class_id = tc.id
      where tc.id = parent_progress_reports.class_id
        and tc.teacher_id = auth.uid()
        and tc.archived_at is null
        and ce.student_id = parent_progress_reports.student_id
    )
  );

create policy parent_progress_reports_teacher_update
  on public.parent_progress_reports for update to authenticated
  using (
    teacher_id = auth.uid()
    and public.is_teacher()
    and exists (
      select 1
      from public.teacher_classes tc
      join public.class_enrollments ce on ce.class_id = tc.id
      where tc.id = parent_progress_reports.class_id
        and tc.teacher_id = auth.uid()
        and tc.archived_at is null
        and ce.student_id = parent_progress_reports.student_id
    )
  )
  with check (
    teacher_id = auth.uid()
    and public.is_teacher()
    and exists (
      select 1
      from public.teacher_classes tc
      join public.class_enrollments ce on ce.class_id = tc.id
      where tc.id = parent_progress_reports.class_id
        and tc.teacher_id = auth.uid()
        and tc.archived_at is null
        and ce.student_id = parent_progress_reports.student_id
    )
  );

create or replace function public.create_parent_progress_report(
  p_student_id uuid,
  p_class_id uuid,
  p_period_start date,
  p_period_end date,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version int;
  v_report_id uuid;
begin
  if not public.is_teacher() or not exists (
    select 1
    from public.teacher_classes tc
    join public.class_enrollments ce on ce.class_id = tc.id
    where tc.id = p_class_id
      and tc.teacher_id = auth.uid()
      and tc.archived_at is null
      and ce.student_id = p_student_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    return jsonb_build_object('ok', false, 'error', 'invalid_period');
  end if;
  if jsonb_typeof(p_snapshot) <> 'object' or p_snapshot ->> 'schemaVersion' <> '1' then
    return jsonb_build_object('ok', false, 'error', 'invalid_snapshot');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  update public.parent_progress_reports
  set status = 'archived', archived_at = now(), updated_at = now()
  where student_id = p_student_id
    and teacher_id = auth.uid()
    and status in ('draft', 'ready_for_review');

  select coalesce(max(version), 0) + 1 into v_version
  from public.parent_progress_reports
  where student_id = p_student_id;

  insert into public.parent_progress_reports(
    student_id, class_id, teacher_id, version, status,
    period_start, period_end, snapshot
  ) values (
    p_student_id, p_class_id, auth.uid(), v_version, 'draft',
    p_period_start, p_period_end, p_snapshot
  ) returning id into v_report_id;

  insert into public.guardian_audit_log(
    student_id, actor_user_id, action, metadata
  ) values (
    p_student_id, auth.uid(), 'parent_progress_report_draft_created',
    jsonb_build_object('reportId', v_report_id, 'version', v_version)
  );

  return jsonb_build_object('ok', true, 'reportId', v_report_id, 'version', v_version);
end;
$$;

create or replace function public.publish_parent_progress_report(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.parent_progress_reports%rowtype;
begin
  select * into v_report
  from public.parent_progress_reports
  where id = p_report_id
  for update;

  if not found or v_report.teacher_id <> auth.uid() or not public.is_teacher() or not exists (
    select 1
    from public.teacher_classes tc
    join public.class_enrollments ce on ce.class_id = tc.id
    where tc.id = v_report.class_id
      and tc.teacher_id = auth.uid()
      and tc.archived_at is null
      and ce.student_id = v_report.student_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if v_report.status not in ('draft', 'ready_for_review') then
    return jsonb_build_object('ok', false, 'error', 'report_not_publishable');
  end if;

  update public.parent_progress_reports
  set status = 'archived', archived_at = now(), updated_at = now()
  where student_id = v_report.student_id
    and status = 'published'
    and id <> v_report.id;

  update public.parent_progress_reports
  set status = 'published', reviewed_at = coalesce(reviewed_at, now()),
      published_at = now(), archived_at = null, updated_at = now()
  where id = v_report.id;

  insert into public.guardian_audit_log(
    student_id, actor_user_id, action, metadata
  ) values (
    v_report.student_id, auth.uid(), 'parent_progress_report_published',
    jsonb_build_object('reportId', v_report.id, 'version', v_report.version)
  );

  return jsonb_build_object('ok', true, 'reportId', v_report.id, 'version', v_report.version);
end;
$$;

create or replace function public.save_parent_progress_report(
  p_report_id uuid,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.parent_progress_reports%rowtype;
begin
  select * into v_report
  from public.parent_progress_reports
  where id = p_report_id
  for update;

  if not found or v_report.teacher_id <> auth.uid() or not public.is_teacher() or not exists (
    select 1
    from public.teacher_classes tc
    join public.class_enrollments ce on ce.class_id = tc.id
    where tc.id = v_report.class_id
      and tc.teacher_id = auth.uid()
      and tc.archived_at is null
      and ce.student_id = v_report.student_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if v_report.status not in ('draft', 'ready_for_review') then
    return jsonb_build_object('ok', false, 'error', 'report_not_editable');
  end if;
  if jsonb_typeof(p_snapshot) <> 'object' or p_snapshot ->> 'schemaVersion' <> '1' then
    return jsonb_build_object('ok', false, 'error', 'invalid_snapshot');
  end if;

  update public.parent_progress_reports
  set snapshot = p_snapshot, status = 'ready_for_review',
      reviewed_at = now(), updated_at = now()
  where id = v_report.id;

  insert into public.guardian_audit_log(
    student_id, actor_user_id, action, metadata
  ) values (
    v_report.student_id, auth.uid(), 'parent_progress_report_reviewed',
    jsonb_build_object('reportId', v_report.id, 'version', v_report.version)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.archive_parent_progress_report(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.parent_progress_reports%rowtype;
begin
  select * into v_report
  from public.parent_progress_reports
  where id = p_report_id
  for update;
  if not found or v_report.teacher_id <> auth.uid() or not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  update public.parent_progress_reports
  set status = 'archived', archived_at = now(), updated_at = now()
  where id = v_report.id;

  insert into public.guardian_audit_log(
    student_id, actor_user_id, action, metadata
  ) values (
    v_report.student_id, auth.uid(), 'parent_progress_report_archived',
    jsonb_build_object('reportId', v_report.id, 'version', v_report.version)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.parent_published_progress_report(p_student_id uuid)
returns table (
  report_id uuid,
  version int,
  period_start date,
  period_end date,
  snapshot jsonb,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_active_guardian(p_student_id) then
    return;
  end if;

  return query
  select
    ppr.id, ppr.version, ppr.period_start, ppr.period_end,
    ppr.snapshot, ppr.published_at
  from public.parent_progress_reports ppr
  where ppr.student_id = p_student_id
    and ppr.status = 'published'
  order by ppr.published_at desc
  limit 1;
end;
$$;

create or replace function public.parent_student_stream(
  p_student_id uuid,
  p_limit int default 40
)
returns table (
  item_type text,
  source_id uuid,
  title text,
  body text,
  context_label text,
  occurred_at timestamptz,
  link_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_active_guardian(p_student_id) then
    return;
  end if;

  return query
  with stream_items as (
    select
      case cp.kind
        when 'announcement' then 'teacher_update'
        when 'link' then 'teacher_link'
        when 'homework_reminder' then 'homework_update'
        when 'activity' then 'learning_activity'
        else 'teacher_update'
      end::text as item_type,
      cp.id as source_id,
      case cp.kind
        when 'announcement' then 'Class update'
        when 'link' then coalesce(cp.link_title, 'Shared link')
        when 'homework_reminder' then 'Homework update'
        when 'activity' then coalesce(cp.activity_title, 'Learning activity')
        else 'Class update'
      end::text as title,
      cp.body,
      tc.title::text as context_label,
      cp.published_at as occurred_at,
      case when cp.kind = 'link' then cp.link_url else null end::text as link_url
    from public.class_posts cp
    join public.teacher_classes tc on tc.id = cp.class_id
    where cp.kind <> 'photo'
      and (
        (cp.guardian_visibility = 'class_guardians' and exists (
          select 1 from public.class_enrollments ce
          where ce.class_id = cp.class_id and ce.student_id = p_student_id
        ))
        or
        (cp.guardian_visibility = 'tagged_student_guardians' and exists (
          select 1 from public.class_post_student_tags tag
          where tag.post_id = cp.id and tag.student_id = p_student_id
        ))
      )

    union all

    select
      psp.kind::text, psp.id, psp.title, psp.body,
      coalesce(psp.context_label, tc.title)::text, psp.occurred_at, null::text
    from public.parent_stream_publications psp
    join public.teacher_classes tc on tc.id = psp.class_id
    where psp.student_id = p_student_id and psp.status = 'published'

    union all

    select
      'progress_report'::text, ppr.id,
      'A new progress report is ready'::text,
      'See recent strengths, the next learning focus, and one way to help at home.'::text,
      tc.title::text, ppr.published_at,
      ('/parent/students/' || p_student_id::text || '/progress')::text
    from public.parent_progress_reports ppr
    join public.teacher_classes tc on tc.id = ppr.class_id
    where ppr.student_id = p_student_id and ppr.status = 'published'
  )
  select
    si.item_type, si.source_id, si.title, si.body,
    si.context_label, si.occurred_at, si.link_url
  from stream_items si
  order by si.occurred_at desc, si.source_id desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
end;
$$;

grant select on public.parent_progress_reports to authenticated;

revoke execute on function public.create_parent_progress_report(uuid, uuid, date, date, jsonb)
  from public, anon;
revoke execute on function public.publish_parent_progress_report(uuid) from public, anon;
revoke execute on function public.save_parent_progress_report(uuid, jsonb) from public, anon;
revoke execute on function public.archive_parent_progress_report(uuid) from public, anon;
revoke execute on function public.parent_published_progress_report(uuid) from public, anon;
grant execute on function public.create_parent_progress_report(uuid, uuid, date, date, jsonb)
  to authenticated;
grant execute on function public.publish_parent_progress_report(uuid) to authenticated;
grant execute on function public.save_parent_progress_report(uuid, jsonb) to authenticated;
grant execute on function public.archive_parent_progress_report(uuid) to authenticated;
grant execute on function public.parent_published_progress_report(uuid) to authenticated;
