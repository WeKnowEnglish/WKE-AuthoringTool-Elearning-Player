-- Add shared vocabulary sources without changing existing lesson or activity IDs.
alter table public.class_lessons
  add column if not exists vocabulary_sources jsonb not null default '[]'::jsonb;

alter table public.class_lessons
  add constraint class_lessons_vocabulary_sources_array
  check (jsonb_typeof(vocabulary_sources) = 'array' and jsonb_array_length(vocabulary_sources) <= 20);

-- Resolve names on the server and verify every reference belongs to this teacher.
create or replace function public.validate_class_lesson_vocabulary_sources(p_sources jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare v_sources jsonb;
begin
  if auth.uid() is null or not public.is_teacher() then
    raise exception 'teacher authentication required';
  end if;
  if p_sources is null or jsonb_typeof(p_sources) <> 'array' or jsonb_array_length(p_sources) > 20 then
    raise exception 'invalid lesson vocabulary sources';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_sources) s
    where not exists (
      select 1 from public.studio_activities a
      where a.id::text = s ->> 'vocabListId' and a.teacher_id = auth.uid() and a.format = 'vocabulary_list'
    )
  ) or (select count(*) from jsonb_array_elements(p_sources)) <>
       (select count(distinct s ->> 'vocabListId') from jsonb_array_elements(p_sources) s) then
    raise exception 'vocabulary list not found or cannot be used';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('vocabListId', a.id, 'name', left(a.title, 120)) order by s.ordinality), '[]'::jsonb)
    into v_sources
    from jsonb_array_elements(p_sources) with ordinality s(value, ordinality)
    join public.studio_activities a on a.id::text = s.value ->> 'vocabListId' and a.teacher_id = auth.uid();
  return v_sources;
end;
$$;

-- Preserve the legacy RPC signature. New clients save sources and steps atomically
-- and use the last-read revision to avoid silently overwriting another editor.
create or replace function public.save_class_lesson_plan_with_vocabulary(
  p_lesson_id uuid, p_title text, p_notes text, p_status text,
  p_objective text, p_duration_minutes integer, p_target_language text,
  p_success_check text, p_steps jsonb, p_vocabulary_sources jsonb,
  p_expected_updated_at timestamptz default null
)
returns void language plpgsql security invoker set search_path = public as $$
declare v_updated_at timestamptz; v_sources jsonb;
begin
  if auth.uid() is null or not public.is_teacher() then raise exception 'teacher authentication required'; end if;
  select updated_at into v_updated_at from public.class_lessons
    where id = p_lesson_id and teacher_id = auth.uid() and status <> 'archived' for update;
  if not found then raise exception 'lesson not found or cannot be edited'; end if;
  if p_expected_updated_at is not null and v_updated_at <> p_expected_updated_at then
    raise exception 'This lesson changed in another session. Reopen it before saving.';
  end if;
  v_sources := public.validate_class_lesson_vocabulary_sources(p_vocabulary_sources);
  if jsonb_typeof(p_steps) <> 'array' then raise exception 'invalid lesson steps'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_steps) s
    where s -> 'config' -> 'generation' is not null and (
      s ->> 'kind' <> 'studio_activity' or
      not exists (select 1 from jsonb_array_elements(v_sources) src
        where src ->> 'vocabListId' = s -> 'config' -> 'generation' -> 'recipe' ->> 'vocabListId') or
      not exists (select 1 from public.studio_activities a
        where a.id::text = s -> 'config' ->> 'activityId' and a.teacher_id = auth.uid())
    )
  ) then raise exception 'generated material must use an attached vocabulary list and a teacher-owned activity'; end if;
  perform public.save_class_lesson_plan(p_lesson_id, p_title, p_notes, p_status,
    p_objective, p_duration_minutes, p_target_language, p_success_check, p_steps);
  update public.class_lessons set vocabulary_sources = v_sources where id = p_lesson_id;
end;
$$;

create or replace function public.create_class_lesson_plan_with_vocabulary(
  p_class_id uuid, p_title text, p_objective text, p_duration_minutes integer,
  p_target_language text, p_success_check text, p_template_key text,
  p_template_version integer, p_steps jsonb, p_vocabulary_sources jsonb
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_sources jsonb;
begin
  v_sources := public.validate_class_lesson_vocabulary_sources(p_vocabulary_sources);
  v_id := public.create_class_lesson_plan(p_class_id, p_title, p_objective,
    p_duration_minutes, p_target_language, p_success_check, p_template_key, p_template_version, p_steps);
  update public.class_lessons set vocabulary_sources = v_sources where id = v_id;
  return v_id;
end;
$$;

-- The validated activity and its lesson step commit together. The step ID is also
-- an operation ID: an uncertain retry returns the original material unchanged.
create or replace function public.add_class_lesson_vocabulary_activity(
  p_lesson_id uuid, p_expected_updated_at timestamptz,
  p_vocab_list_id uuid, p_source_updated_at timestamptz,
  p_activity_id uuid, p_step jsonb, p_pack jsonb, p_authoring jsonb, p_source jsonb
)
returns void language plpgsql security invoker set search_path = public as $$
declare v_lesson public.class_lessons%rowtype; v_existing jsonb; v_count integer;
begin
  if auth.uid() is null or not public.is_teacher() then raise exception 'teacher authentication required'; end if;
  select * into v_lesson from public.class_lessons
    where id = p_lesson_id and teacher_id = auth.uid() and status <> 'archived' for update;
  if not found then raise exception 'lesson not found or cannot be edited'; end if;
  select config into v_existing from public.class_lesson_steps
    where id = (p_step ->> 'id')::uuid and lesson_id = p_lesson_id;
  if found then
    if v_existing ->> 'activityId' = p_activity_id::text and
       v_existing -> 'generation' ->> 'inputHash' = p_step -> 'config' -> 'generation' ->> 'inputHash' then
      return;
    end if;
    raise exception 'Generation retry has different inputs. Start a new generation.';
  end if;
  if p_expected_updated_at is null or v_lesson.updated_at <> p_expected_updated_at then
    raise exception 'This lesson changed in another session. Reopen it before generating.';
  end if;
  if not exists (select 1 from jsonb_array_elements(v_lesson.vocabulary_sources) s
    where s ->> 'vocabListId' = p_vocab_list_id::text) then raise exception 'attach the vocabulary list first'; end if;
  -- Lock the source until commit so concurrent vocabulary edits cannot produce a
  -- material stamped with a revision different from the compiled inputs.
  perform 1 from public.studio_activities where id = p_vocab_list_id
    and teacher_id = auth.uid() and format = 'vocabulary_list' and updated_at = p_source_updated_at for share;
  if not found then raise exception 'Vocabulary changed while generating. Reload the list and try again.'; end if;
  if p_step ->> 'kind' <> 'studio_activity' or
     p_step -> 'config' ->> 'format' not in ('flashcards', 'multiple_choice') or
     p_step -> 'config' ->> 'activityId' <> p_activity_id::text or
     p_step -> 'config' -> 'generation' -> 'recipe' ->> 'vocabListId' <> p_vocab_list_id::text then
    raise exception 'invalid generated lesson material';
  end if;
  select count(*) into v_count from public.class_lesson_steps where lesson_id = p_lesson_id;
  if v_count >= 20 then raise exception 'A lesson can contain up to 20 steps.'; end if;
  insert into public.studio_activities (id, teacher_id, format, title, pack, authoring, source)
    values (p_activity_id, auth.uid(), p_step -> 'config' ->> 'format', p_step ->> 'title', p_pack, p_authoring, p_source);
  insert into public.class_lesson_steps (id, lesson_id, position, kind, title, phase, duration_minutes, teacher_action, student_action, config)
    values ((p_step ->> 'id')::uuid, p_lesson_id,
      coalesce((select max(position) + 1 from public.class_lesson_steps where lesson_id = p_lesson_id), 0),
      'studio_activity', p_step ->> 'title', p_step ->> 'phase', (p_step ->> 'durationMinutes')::integer,
      p_step ->> 'teacherAction', p_step ->> 'studentAction', p_step -> 'config');
  update public.class_lessons set updated_at = now() where id = p_lesson_id;
end;
$$;

revoke all on function public.validate_class_lesson_vocabulary_sources(jsonb) from public;
revoke all on function public.save_class_lesson_plan_with_vocabulary(uuid,text,text,text,text,integer,text,text,jsonb,jsonb,timestamptz) from public;
revoke all on function public.create_class_lesson_plan_with_vocabulary(uuid,text,text,integer,text,text,text,integer,jsonb,jsonb) from public;
revoke all on function public.add_class_lesson_vocabulary_activity(uuid,timestamptz,uuid,timestamptz,uuid,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.validate_class_lesson_vocabulary_sources(jsonb) to authenticated;
grant execute on function public.save_class_lesson_plan_with_vocabulary(uuid,text,text,text,text,integer,text,text,jsonb,jsonb,timestamptz) to authenticated;
grant execute on function public.create_class_lesson_plan_with_vocabulary(uuid,text,text,integer,text,text,text,integer,jsonb,jsonb) to authenticated;
grant execute on function public.add_class_lesson_vocabulary_activity(uuid,timestamptz,uuid,timestamptz,uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;

-- Student outline projection is unchanged: source content and recipes stay private.
