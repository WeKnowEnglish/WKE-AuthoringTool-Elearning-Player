-- Optional student classroom tabs (Schedule / Noticeboard / Materials).
-- Stream is always available; these three default off until a teacher enables them.

alter table public.teacher_classes
  add column if not exists student_tab_schedule_enabled boolean not null default false,
  add column if not exists student_tab_noticeboard_enabled boolean not null default false,
  add column if not exists student_tab_materials_enabled boolean not null default false;

create or replace function public.student_class_memberships()
returns table (
  class_id uuid,
  title text,
  enrolled_at timestamptz,
  student_tab_schedule_enabled boolean,
  student_tab_noticeboard_enabled boolean,
  student_tab_materials_enabled boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ce.class_id,
    tc.title,
    ce.enrolled_at,
    tc.student_tab_schedule_enabled,
    tc.student_tab_noticeboard_enabled,
    tc.student_tab_materials_enabled
  from public.class_enrollments ce
  join public.teacher_classes tc on tc.id = ce.class_id
  where public.is_student()
    and ce.student_id = auth.uid()
  order by ce.enrolled_at asc;
$$;

grant execute on function public.student_class_memberships() to authenticated;
