-- Teacher-owned draft question sets: authenticated CRUD via RLS (Phase Q4).

grant insert, update, delete on public.live_game_question_sets to authenticated;
grant insert, update, delete on public.live_game_questions to authenticated;

drop policy if exists live_game_question_sets_teacher_draft_select on public.live_game_question_sets;
create policy live_game_question_sets_teacher_draft_select
  on public.live_game_question_sets for select
  to authenticated
  using (visibility = 'teacher' and created_by = auth.uid());

drop policy if exists live_game_question_sets_teacher_insert on public.live_game_question_sets;
create policy live_game_question_sets_teacher_insert
  on public.live_game_question_sets for insert
  to authenticated
  with check (
    visibility = 'teacher'
    and created_by = auth.uid()
    and status = 'draft'
  );

drop policy if exists live_game_question_sets_teacher_draft_update on public.live_game_question_sets;
create policy live_game_question_sets_teacher_draft_update
  on public.live_game_question_sets for update
  to authenticated
  using (visibility = 'teacher' and created_by = auth.uid() and status = 'draft')
  with check (visibility = 'teacher' and created_by = auth.uid());

drop policy if exists live_game_question_sets_teacher_draft_delete on public.live_game_question_sets;
create policy live_game_question_sets_teacher_draft_delete
  on public.live_game_question_sets for delete
  to authenticated
  using (visibility = 'teacher' and created_by = auth.uid() and status = 'draft');

drop policy if exists live_game_questions_teacher_draft_select on public.live_game_questions;
create policy live_game_questions_teacher_draft_select
  on public.live_game_questions for select
  to authenticated
  using (
    exists (
      select 1
      from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  );

drop policy if exists live_game_questions_teacher_insert on public.live_game_questions;
create policy live_game_questions_teacher_insert
  on public.live_game_questions for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  );

drop policy if exists live_game_questions_teacher_update on public.live_game_questions;
create policy live_game_questions_teacher_update
  on public.live_game_questions for update
  to authenticated
  using (
    exists (
      select 1
      from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  )
  with check (
    exists (
      select 1
      from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  );

drop policy if exists live_game_questions_teacher_delete on public.live_game_questions;
create policy live_game_questions_teacher_delete
  on public.live_game_questions for delete
  to authenticated
  using (
    exists (
      select 1
      from public.live_game_question_sets s
      where s.id = set_id
        and s.visibility = 'teacher'
        and s.created_by = auth.uid()
        and s.status = 'draft'
    )
  );
