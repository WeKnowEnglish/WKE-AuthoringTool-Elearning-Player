-- Private Supabase Realtime authorization for class-linked Virtual Classrooms.
-- One-off guest sessions intentionally remain outside this first channel pilot.
-- Before enabling a client channel, disable Realtime Dashboard > Settings >
-- "Allow public access" for this Supabase project.

drop policy if exists "classroom participants can receive realtime" on realtime.messages;
drop policy if exists "classroom participants can send realtime" on realtime.messages;

create policy "classroom participants can receive realtime"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and exists (
      select 1
      from public.class_sessions cs
      where realtime.topic() = ('classroom:' || cs.id)
        and cs.status = 'active'
        and (
          cs.created_by = auth.uid()::text
          or (
            cs.class_id is not null
            and exists (
              select 1 from public.teacher_classes tc
              where tc.id = cs.class_id and tc.teacher_id = auth.uid()
            )
          )
          or (
            cs.class_id is not null
            and exists (
              select 1 from public.class_enrollments ce
              where ce.class_id = cs.class_id and ce.student_id = auth.uid()
            )
          )
        )
    )
  );

create policy "classroom participants can send realtime"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and exists (
      select 1
      from public.class_sessions cs
      where realtime.topic() = ('classroom:' || cs.id)
        and cs.status = 'active'
        and (
          cs.created_by = auth.uid()::text
          or (
            cs.class_id is not null
            and exists (
              select 1 from public.teacher_classes tc
              where tc.id = cs.class_id and tc.teacher_id = auth.uid()
            )
          )
          or (
            cs.class_id is not null
            and exists (
              select 1 from public.class_enrollments ce
              where ce.class_id = cs.class_id and ce.student_id = auth.uid()
            )
          )
        )
    )
  );

comment on policy "classroom participants can receive realtime" on realtime.messages is
  'Class-linked VC control channel only. Event payloads are not authoritative; teacher commands remain server-validated.';
