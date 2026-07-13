-- Close direct authenticated-student access to answer payloads and teacher draft mutations.
-- API challenge routes use the service role and return sanitized client payloads.

alter policy live_game_question_sets_published_select
  on public.live_game_question_sets
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and status = 'published'
  );

alter policy live_game_questions_published_select
  on public.live_game_questions
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and exists (
      select 1
      from public.live_game_question_sets s
      where s.id = set_id and s.status = 'published'
    )
  );

alter policy live_game_question_sets_teacher_draft_select
  on public.live_game_question_sets
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and visibility = 'teacher'
    and created_by = auth.uid()
  );

alter policy live_game_question_sets_teacher_insert
  on public.live_game_question_sets
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and visibility = 'teacher'
    and created_by = auth.uid()
    and status = 'draft'
  );

alter policy live_game_question_sets_teacher_draft_update
  on public.live_game_question_sets
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and visibility = 'teacher'
    and created_by = auth.uid()
    and status = 'draft'
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and visibility = 'teacher'
    and created_by = auth.uid()
  );

alter policy live_game_question_sets_teacher_draft_delete
  on public.live_game_question_sets
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and visibility = 'teacher'
    and created_by = auth.uid()
    and status = 'draft'
  );

alter policy live_game_questions_teacher_draft_select
  on public.live_game_questions
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and exists (
      select 1 from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  );

alter policy live_game_questions_teacher_insert
  on public.live_game_questions
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and exists (
      select 1 from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  );

alter policy live_game_questions_teacher_update
  on public.live_game_questions
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and exists (
      select 1 from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and exists (
      select 1 from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  );

alter policy live_game_questions_teacher_delete
  on public.live_game_questions
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    and exists (
      select 1 from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  );
