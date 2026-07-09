create or replace function public.student_class_memberships()
returns table (
  class_id uuid,
  title text,
  enrolled_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ce.class_id, tc.title, ce.enrolled_at
  from public.class_enrollments ce
  join public.teacher_classes tc on tc.id = ce.class_id
  where public.is_student()
    and ce.student_id = auth.uid()
  order by ce.enrolled_at asc;
$$;

grant execute on function public.student_class_memberships() to authenticated;
