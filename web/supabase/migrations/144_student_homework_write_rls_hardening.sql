-- Keep direct homework writes aligned with the shared student authorization contract.
-- This migration changes policies only; it does not modify existing homework data.

drop policy if exists class_homework_completions_student_insert
  on public.class_homework_completions;
create policy class_homework_completions_student_insert
  on public.class_homework_completions for insert
  to authenticated
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments ce
        on ce.class_id = h.class_id
       and ce.student_id = auth.uid()
      where h.id = homework_id
        and h.status in ('assigned', 'closed')
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );

drop policy if exists class_homework_completions_student_update
  on public.class_homework_completions;
create policy class_homework_completions_student_update
  on public.class_homework_completions for update
  to authenticated
  using (
    public.is_student()
    and student_id = auth.uid()
  )
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments ce
        on ce.class_id = h.class_id
       and ce.student_id = auth.uid()
      where h.id = homework_id
        and h.status in ('assigned', 'closed')
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );

drop policy if exists "homework_template_speaking_student_select"
  on public.homework_template_speaking_recordings;
create policy "homework_template_speaking_student_select"
  on public.homework_template_speaking_recordings for select
  to authenticated
  using (public.is_student() and student_id = auth.uid());

drop policy if exists "homework_template_speaking_student_insert"
  on public.homework_template_speaking_recordings;
create policy "homework_template_speaking_student_insert"
  on public.homework_template_speaking_recordings for insert
  to authenticated
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments e
        on e.class_id = h.class_id
       and e.student_id = auth.uid()
      where h.id = homework_id
        and h.status = 'assigned'
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );

drop policy if exists "homework_template_speaking_student_update"
  on public.homework_template_speaking_recordings;
create policy "homework_template_speaking_student_update"
  on public.homework_template_speaking_recordings for update
  to authenticated
  using (
    public.is_student()
    and student_id = auth.uid()
  )
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments e
        on e.class_id = h.class_id
       and e.student_id = auth.uid()
      where h.id = homework_id
        and h.status = 'assigned'
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );

drop policy if exists "homework_collection_speaking_student_select"
  on public.homework_collection_speaking_recordings;
create policy "homework_collection_speaking_student_select"
  on public.homework_collection_speaking_recordings for select
  to authenticated
  using (public.is_student() and student_id = auth.uid());

drop policy if exists "homework_collection_speaking_student_insert"
  on public.homework_collection_speaking_recordings;
create policy "homework_collection_speaking_student_insert"
  on public.homework_collection_speaking_recordings for insert
  to authenticated
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments e
        on e.class_id = h.class_id
       and e.student_id = auth.uid()
      where h.id = homework_id
        and h.status = 'assigned'
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );

drop policy if exists "homework_collection_speaking_student_update"
  on public.homework_collection_speaking_recordings;
create policy "homework_collection_speaking_student_update"
  on public.homework_collection_speaking_recordings for update
  to authenticated
  using (
    public.is_student()
    and student_id = auth.uid()
  )
  with check (
    public.is_student()
    and student_id = auth.uid()
    and exists (
      select 1
      from public.class_homework h
      join public.class_enrollments e
        on e.class_id = h.class_id
       and e.student_id = auth.uid()
      where h.id = homework_id
        and h.status = 'assigned'
        and (h.target_student_ids is null or auth.uid() = any(h.target_student_ids))
    )
  );
