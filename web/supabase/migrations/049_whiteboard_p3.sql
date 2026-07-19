-- Whiteboard P3: authenticated RLS for class-bound rounds + feedback reads.

grant select on public.whiteboard_rounds to authenticated;
grant select on public.whiteboard_submissions to authenticated;
grant select on public.whiteboard_feedback to authenticated;
grant select on public.whiteboard_boards to authenticated;
grant select on public.class_sessions to authenticated;
grant select on public.whiteboard_awards to authenticated;

-- Teachers: rounds for their classes or hosted by them.
create policy whiteboard_rounds_teacher_select
  on public.whiteboard_rounds for select
  to authenticated
  using (
    public.is_teacher()
    and (
      host_user_id = auth.uid()::text
      or (
        class_id is not null
        and exists (
          select 1
          from public.teacher_classes tc
          where tc.id = whiteboard_rounds.class_id
            and tc.teacher_id = auth.uid()
        )
      )
    )
  );

-- Students: rounds for classes they are enrolled in.
create policy whiteboard_rounds_student_select
  on public.whiteboard_rounds for select
  to authenticated
  using (
    class_id is not null
    and exists (
      select 1
      from public.class_enrollments ce
      where ce.class_id = whiteboard_rounds.class_id
        and ce.student_id = auth.uid()
    )
  );

create policy whiteboard_submissions_teacher_select
  on public.whiteboard_submissions for select
  to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.whiteboard_rounds wr
      where wr.id = whiteboard_submissions.round_id
        and (
          wr.host_user_id = auth.uid()::text
          or (
            wr.class_id is not null
            and exists (
              select 1
              from public.teacher_classes tc
              where tc.id = wr.class_id
                and tc.teacher_id = auth.uid()
            )
          )
        )
    )
  );

create policy whiteboard_submissions_student_select
  on public.whiteboard_submissions for select
  to authenticated
  using (
    owner_id = auth.uid()::text
    or auth.uid()::text = any (contributor_ids)
    or exists (
      select 1
      from public.whiteboard_rounds wr
      join public.class_enrollments ce on ce.class_id = wr.class_id
      where wr.id = whiteboard_submissions.round_id
        and ce.student_id = auth.uid()
        and wr.archived_at is not null
    )
  );

create policy whiteboard_feedback_teacher_select
  on public.whiteboard_feedback for select
  to authenticated
  using (
    public.is_teacher()
    and (
      teacher_id = auth.uid()::text
      or exists (
        select 1
        from public.whiteboard_submissions ws
        join public.whiteboard_rounds wr on wr.id = ws.round_id
        where ws.id = whiteboard_feedback.submission_id
          and (
            wr.host_user_id = auth.uid()::text
            or (
              wr.class_id is not null
              and exists (
                select 1 from public.teacher_classes tc
                where tc.id = wr.class_id and tc.teacher_id = auth.uid()
              )
            )
          )
      )
    )
  );

create policy whiteboard_feedback_student_select
  on public.whiteboard_feedback for select
  to authenticated
  using (
    exists (
      select 1
      from public.whiteboard_submissions ws
      where ws.id = whiteboard_feedback.submission_id
        and (
          ws.owner_id = auth.uid()::text
          or auth.uid()::text = any (ws.contributor_ids)
        )
    )
  );

create policy class_sessions_teacher_select
  on public.class_sessions for select
  to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.teacher_classes tc
      where tc.id = class_sessions.class_id
        and tc.teacher_id = auth.uid()
    )
  );

create policy class_sessions_student_select
  on public.class_sessions for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_enrollments ce
      where ce.class_id = class_sessions.class_id
        and ce.student_id = auth.uid()
    )
  );

create policy whiteboard_awards_student_select
  on public.whiteboard_awards for select
  to authenticated
  using (student_id = auth.uid()::text);

create policy whiteboard_awards_teacher_select
  on public.whiteboard_awards for select
  to authenticated
  using (
    public.is_teacher()
    and (
      teacher_id = auth.uid()::text
      or exists (
        select 1
        from public.whiteboard_rounds wr
        where wr.id = whiteboard_awards.round_id
          and wr.host_user_id = auth.uid()::text
      )
    )
  );
