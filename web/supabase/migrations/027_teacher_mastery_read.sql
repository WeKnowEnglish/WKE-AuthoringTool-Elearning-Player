-- T1: teacher read access to student_mastery_records (enrollment-scoped)

create or replace function public.teacher_can_read_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_teacher()
    and exists (
      select 1
      from public.class_enrollments ce
      join public.teacher_classes tc on tc.id = ce.class_id
      where ce.student_id = p_student_id
        and tc.teacher_id = auth.uid()
    );
$$;

create policy "student_mastery_records_teacher_select_enrolled"
  on public.student_mastery_records for select
  to authenticated
  using (public.teacher_can_read_student(student_id));
