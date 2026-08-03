-- Optional per-student targeting for class homework. Null keeps the existing whole-class behavior.

alter table public.class_homework
  add column if not exists target_student_ids uuid[];

alter table public.class_homework
  drop constraint if exists class_homework_target_students_nonempty;
alter table public.class_homework
  add constraint class_homework_target_students_nonempty
  check (target_student_ids is null or cardinality(target_student_ids) > 0);

drop policy if exists class_homework_student_select on public.class_homework;
create policy class_homework_student_select
  on public.class_homework for select
  to authenticated
  using (
    public.is_student()
    and status in ('assigned', 'closed')
    and exists (
      select 1 from public.class_enrollments ce
      where ce.class_id = class_homework.class_id and ce.student_id = auth.uid()
    )
    and (target_student_ids is null or auth.uid() = any(target_student_ids))
  );

create index if not exists class_homework_target_students_idx
  on public.class_homework using gin(target_student_ids);
