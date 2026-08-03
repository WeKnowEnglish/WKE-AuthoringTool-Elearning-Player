-- Lightweight, teacher-owned lesson planning on the existing class lesson domain.

alter table public.class_lessons
  add column if not exists objective text not null default '',
  add column if not exists duration_minutes integer not null default 45,
  add column if not exists target_language text not null default '',
  add column if not exists success_check text not null default '',
  add column if not exists template_key text,
  add column if not exists template_version integer,
  add column if not exists published_at timestamptz;

-- Some deployed databases have class lessons without migration 077. Keep the
-- planner migration independently runnable and preserve the existing index
-- contract when published_at is introduced here.
create index if not exists class_lessons_class_published_idx
  on public.class_lessons (class_id, published_at desc)
  where published_at is not null;

alter table public.class_lessons
  drop constraint if exists class_lessons_objective_len,
  add constraint class_lessons_objective_len check (char_length(objective) <= 1000),
  drop constraint if exists class_lessons_duration_range,
  add constraint class_lessons_duration_range check (duration_minutes between 5 and 240),
  drop constraint if exists class_lessons_target_language_len,
  add constraint class_lessons_target_language_len check (char_length(target_language) <= 1500),
  drop constraint if exists class_lessons_success_check_len,
  add constraint class_lessons_success_check_len check (char_length(success_check) <= 1000),
  drop constraint if exists class_lessons_template_version_positive,
  add constraint class_lessons_template_version_positive
    check (template_version is null or template_version > 0);

alter table public.class_lesson_steps
  add column if not exists phase text not null default 'custom',
  add column if not exists duration_minutes integer not null default 5,
  add column if not exists teacher_action text not null default '',
  add column if not exists student_action text not null default '';

alter table public.class_lesson_steps
  drop constraint if exists class_lesson_steps_kind_check,
  add constraint class_lesson_steps_kind_check
    check (kind in (
      'custom',
      'whiteboard',
      'document',
      'word_cards',
      'live_game',
      'studio_activity'
    )),
  drop constraint if exists class_lesson_steps_phase_check,
  add constraint class_lesson_steps_phase_check
    check (phase in (
      'warm_up',
      'review',
      'teach',
      'guided_practice',
      'independent_practice',
      'communicative_practice',
      'assessment',
      'reflection',
      'homework',
      'custom'
    )),
  drop constraint if exists class_lesson_steps_duration_range,
  add constraint class_lesson_steps_duration_range
    check (duration_minutes between 1 and 120),
  drop constraint if exists class_lesson_steps_teacher_action_len,
  add constraint class_lesson_steps_teacher_action_len
    check (char_length(teacher_action) <= 1500),
  drop constraint if exists class_lesson_steps_student_action_len,
  add constraint class_lesson_steps_student_action_len
    check (char_length(student_action) <= 1500);

-- Create a complete template-backed lesson and its steps in one transaction.
create or replace function public.create_class_lesson_plan(
  p_class_id uuid,
  p_title text,
  p_objective text,
  p_duration_minutes integer,
  p_target_language text,
  p_success_check text,
  p_template_key text,
  p_template_version integer,
  p_steps jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson_id uuid;
begin
  if not public.is_teacher() or auth.uid() is null then
    raise exception 'teacher authentication required';
  end if;

  if not exists (
    select 1 from public.teacher_classes
    where id = p_class_id and teacher_id = auth.uid()
  ) then
    raise exception 'class not found';
  end if;

  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) > 20 then
    raise exception 'invalid lesson steps';
  end if;

  insert into public.class_lessons (
    class_id,
    teacher_id,
    title,
    status,
    notes,
    objective,
    duration_minutes,
    target_language,
    success_check,
    template_key,
    template_version
  ) values (
    p_class_id,
    auth.uid(),
    p_title,
    'draft',
    '',
    p_objective,
    p_duration_minutes,
    p_target_language,
    p_success_check,
    nullif(trim(p_template_key), ''),
    p_template_version
  )
  returning id into v_lesson_id;

  insert into public.class_lesson_steps (
    id,
    lesson_id,
    position,
    kind,
    title,
    phase,
    duration_minutes,
    teacher_action,
    student_action,
    config
  )
  select
    coalesce(nullif(step.value ->> 'id', '')::uuid, gen_random_uuid()),
    v_lesson_id,
    (step.ordinality - 1)::integer,
    step.value ->> 'kind',
    step.value ->> 'title',
    coalesce(nullif(step.value ->> 'phase', ''), 'custom'),
    coalesce((step.value ->> 'durationMinutes')::integer, 5),
    coalesce(step.value ->> 'teacherAction', ''),
    coalesce(step.value ->> 'studentAction', ''),
    coalesce(step.value -> 'config', '{}'::jsonb)
  from jsonb_array_elements(p_steps) with ordinality as step(value, ordinality);

  return v_lesson_id;
end;
$$;

-- Save the header and complete ordered step set atomically. Any insert failure
-- rolls the deletion back, so a lesson cannot be left with a missing playlist.
create or replace function public.save_class_lesson_plan(
  p_lesson_id uuid,
  p_title text,
  p_notes text,
  p_status text,
  p_objective text,
  p_duration_minutes integer,
  p_target_language text,
  p_success_check text,
  p_steps jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_teacher() or auth.uid() is null then
    raise exception 'teacher authentication required';
  end if;

  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) > 20 then
    raise exception 'invalid lesson steps';
  end if;

  if p_status = 'ready' and jsonb_array_length(p_steps) = 0 then
    raise exception 'a ready lesson needs at least one step';
  end if;

  update public.class_lessons
  set
    title = p_title,
    notes = p_notes,
    status = p_status,
    objective = p_objective,
    duration_minutes = p_duration_minutes,
    target_language = p_target_language,
    success_check = p_success_check,
    updated_at = now()
  where id = p_lesson_id
    and teacher_id = auth.uid()
    and status <> 'archived';

  if not found then
    raise exception 'lesson not found or cannot be edited';
  end if;

  delete from public.class_lesson_steps where lesson_id = p_lesson_id;

  insert into public.class_lesson_steps (
    id,
    lesson_id,
    position,
    kind,
    title,
    phase,
    duration_minutes,
    teacher_action,
    student_action,
    config
  )
  select
    coalesce(nullif(step.value ->> 'id', '')::uuid, gen_random_uuid()),
    p_lesson_id,
    (step.ordinality - 1)::integer,
    step.value ->> 'kind',
    step.value ->> 'title',
    coalesce(nullif(step.value ->> 'phase', ''), 'custom'),
    coalesce((step.value ->> 'durationMinutes')::integer, 5),
    coalesce(step.value ->> 'teacherAction', ''),
    coalesce(step.value ->> 'studentAction', ''),
    coalesce(step.value -> 'config', '{}'::jsonb)
  from jsonb_array_elements(p_steps) with ordinality as step(value, ordinality);
end;
$$;

revoke all on function public.create_class_lesson_plan(
  uuid, text, text, integer, text, text, text, integer, jsonb
) from public;
grant execute on function public.create_class_lesson_plan(
  uuid, text, text, integer, text, text, text, integer, jsonb
) to authenticated;

revoke all on function public.save_class_lesson_plan(
  uuid, text, text, text, text, integer, text, text, jsonb
) from public;
grant execute on function public.save_class_lesson_plan(
  uuid, text, text, text, text, integer, text, text, jsonb
) to authenticated;

-- Published class materials are exposed through a narrow RPC projection. Row
-- policies grant whole-row access, so they are not suitable for private plan
-- notes, teacher instructions, or future differentiation fields.
drop policy if exists class_lessons_student_select_published
  on public.class_lessons;
drop policy if exists class_lesson_steps_student_select_published
  on public.class_lesson_steps;

create or replace function public.list_published_class_materials(
  p_class_id uuid,
  p_limit integer default 20
)
returns table (
  lesson_id uuid,
  class_id uuid,
  lesson_title text,
  published_at timestamptz,
  step_id uuid,
  step_position integer,
  step_kind text,
  step_title text,
  step_phase text,
  step_duration_minutes integer,
  step_student_action text
)
language sql
stable
security definer
set search_path = public
as $$
  with allowed_lessons as (
    select cl.id, cl.class_id, cl.title, cl.published_at
    from public.class_lessons cl
    where public.is_student()
      and cl.class_id = p_class_id
      and cl.published_at is not null
      and exists (
        select 1
        from public.class_enrollments ce
        where ce.class_id = cl.class_id
          and ce.student_id = auth.uid()
      )
    order by cl.published_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
  )
  select
    al.id,
    al.class_id,
    al.title,
    al.published_at,
    cls.id,
    cls.position,
    cls.kind,
    cls.title,
    cls.phase,
    cls.duration_minutes,
    cls.student_action
  from allowed_lessons al
  left join public.class_lesson_steps cls on cls.lesson_id = al.id
  order by al.published_at desc, cls.position asc;
$$;

revoke all on function public.list_published_class_materials(uuid, integer)
  from public;
grant execute on function public.list_published_class_materials(uuid, integer)
  to authenticated;
