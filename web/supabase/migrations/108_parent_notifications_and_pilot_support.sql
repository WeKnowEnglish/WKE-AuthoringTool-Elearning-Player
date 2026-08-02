-- Parent Portal Phase 4: privacy-limited notifications and parent-surface diagnostics.

create table if not exists public.parent_notifications (
  id uuid primary key default gen_random_uuid(),
  guardian_user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  notification_type text not null
    check (notification_type in ('report_published', 'access_changed')),
  source_id uuid not null,
  title text not null,
  body text not null default '',
  link_path text,
  visible_in_app boolean not null default true,
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sent', 'failed', 'disabled')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint parent_notifications_title_len check (char_length(title) between 1 and 160),
  constraint parent_notifications_body_len check (char_length(body) <= 500),
  constraint parent_notifications_link_parent_only
    check (link_path is null or link_path like '/parent/%'),
  unique(guardian_user_id, notification_type, source_id)
);

create index if not exists parent_notifications_guardian_created_idx
  on public.parent_notifications(guardian_user_id, created_at desc);
create index if not exists parent_notifications_guardian_unread_idx
  on public.parent_notifications(guardian_user_id, created_at desc)
  where read_at is null;

alter table public.parent_notifications enable row level security;

create policy parent_notifications_select_own
  on public.parent_notifications for select to authenticated
  using (guardian_user_id = auth.uid() and visible_in_app = true);

create or replace function public.create_report_published_notifications(p_report_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.parent_progress_reports%rowtype;
  v_count int := 0;
begin
  select * into v_report
  from public.parent_progress_reports
  where id = p_report_id;
  if not found or v_report.status <> 'published'
    or v_report.teacher_id <> auth.uid() or not public.is_teacher()
    or not public.teacher_can_manage_guardians(v_report.student_id) then
    return 0;
  end if;

  insert into public.parent_notifications(
    guardian_user_id, student_id, notification_type, source_id,
    title, body, link_path, visible_in_app
  )
  select
    sg.guardian_user_id, v_report.student_id, 'report_published', v_report.id,
    'A new progress report is ready',
    'Sign in to see the teacher-reviewed learning update.',
    '/parent/students/' || v_report.student_id::text || '/progress',
    coalesce((pp.notification_preferences ->> 'inApp')::boolean, true)
  from public.student_guardians sg
  left join public.parent_profiles pp on pp.user_id = sg.guardian_user_id
  where sg.student_id = v_report.student_id and sg.status = 'active'
  on conflict (guardian_user_id, notification_type, source_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.create_access_changed_notification(p_relationship_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relationship public.student_guardians%rowtype;
begin
  select * into v_relationship
  from public.student_guardians
  where id = p_relationship_id;
  if not found or not public.teacher_can_manage_guardians(v_relationship.student_id) then
    return 0;
  end if;
  insert into public.parent_notifications(
    guardian_user_id, student_id, notification_type, source_id,
    title, body, link_path, visible_in_app
  ) values (
    v_relationship.guardian_user_id, v_relationship.student_id,
    'access_changed', v_relationship.id,
    'Family access changed',
    'A teacher updated one of your child connections. View your current linked children for details.',
    '/parent/manage-children',
    coalesce((
      select (pp.notification_preferences ->> 'inApp')::boolean
      from public.parent_profiles pp
      where pp.user_id = v_relationship.guardian_user_id
    ), true)
  )
  on conflict (guardian_user_id, notification_type, source_id) do nothing;
  return 1;
end;
$$;

create or replace function public.mark_parent_notification_read(p_notification_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.parent_notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and guardian_user_id = auth.uid()
  returning true;
$$;

create or replace function public.mark_all_parent_notifications_read()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.parent_notifications
  set read_at = now()
  where guardian_user_id = auth.uid() and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant select on public.parent_notifications to authenticated;
revoke execute on function public.create_report_published_notifications(uuid) from public, anon;
revoke execute on function public.create_access_changed_notification(uuid) from public, anon;
revoke execute on function public.mark_parent_notification_read(uuid) from public, anon;
revoke execute on function public.mark_all_parent_notifications_read() from public, anon;
grant execute on function public.create_report_published_notifications(uuid) to authenticated;
grant execute on function public.create_access_changed_notification(uuid) to authenticated;
grant execute on function public.mark_parent_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_parent_notifications_read() to authenticated;

-- Extend the existing short-lived, sanitized diagnostics surface for parent UX signals.
alter table public.platform_usage_events
  drop constraint if exists platform_usage_events_surface_check;
alter table public.platform_usage_events
  add constraint platform_usage_events_surface_check
  check (surface in ('student', 'teacher', 'lesson', 'live-game', 'admin', 'parent'));
