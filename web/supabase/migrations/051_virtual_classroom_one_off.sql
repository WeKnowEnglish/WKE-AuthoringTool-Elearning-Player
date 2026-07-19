-- Virtual Classroom one-off sessions: class_id optional; host by created_by teacher.

alter table public.class_sessions
  alter column class_id drop not null;

-- Teachers can read sessions they created (one-off) or for their classes.
drop policy if exists class_sessions_teacher_select on public.class_sessions;
create policy class_sessions_teacher_select
  on public.class_sessions for select
  to authenticated
  using (
    public.is_teacher()
    and (
      created_by = auth.uid()::text
      or (
        class_id is not null
        and exists (
          select 1
          from public.teacher_classes tc
          where tc.id = class_sessions.class_id
            and tc.teacher_id = auth.uid()
        )
      )
    )
  );
