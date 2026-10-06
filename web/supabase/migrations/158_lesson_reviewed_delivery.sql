-- Pending rollout: apply after 157. No destructive backfill of legacy plans/sessions.
create table public.class_lesson_releases (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.class_lessons(id) on delete restrict,
  class_id uuid not null references public.teacher_classes(id) on delete restrict,
  teacher_id uuid not null,
  source_updated_at timestamptz not null,
  reviewed_materials jsonb not null,
  snapshot jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (lesson_id, source_updated_at, reviewed_materials)
);
alter table public.class_lesson_releases enable row level security;
create policy class_lesson_releases_teacher_read on public.class_lesson_releases
  for select to authenticated using (public.is_teacher() and teacher_id = auth.uid());
revoke all on public.class_lesson_releases from authenticated;
grant select on public.class_lesson_releases to authenticated;

alter table public.class_lessons
  add column latest_release_id uuid references public.class_lesson_releases(id),
  add column released_at timestamptz,
  add column released_updated_at timestamptz;
alter table public.class_sessions add column lesson_release_id uuid references public.class_lesson_releases(id);
alter table public.class_homework
  add column lesson_release_id uuid references public.class_lesson_releases(id),
  add column lesson_step_id uuid;
create unique index class_homework_released_step_once on public.class_homework (lesson_release_id, lesson_step_id)
  where lesson_release_id is not null;

-- Capture canonical DB content under locks. Clients send only the revision they reviewed.
create function public.release_class_lesson_plan(
  p_lesson_id uuid, p_expected_updated_at timestamptz, p_material_revisions jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  l public.class_lessons%rowtype; s public.class_lesson_steps%rowtype;
  a public.studio_activities%rowtype; v_id uuid; v_now timestamptz := clock_timestamp();
  v_steps jsonb := '[]'; v_materials jsonb := '{}'; v_revisions jsonb := '{}';
  v_planning jsonb; v_homework boolean; v_class_minutes integer := 0; v_class_steps integer := 0;
begin
  if auth.uid() is null or not public.is_teacher() then raise exception 'teacher authentication required'; end if;
  if p_expected_updated_at is null or jsonb_typeof(p_material_revisions) is distinct from 'object' then raise exception 'Review the saved lesson before releasing.'; end if;
  select * into l from public.class_lessons where id = p_lesson_id and teacher_id = auth.uid() for update;
  if not found or l.status = 'archived' or not exists(select 1 from public.teacher_classes where id=l.class_id and teacher_id=auth.uid() and archived_at is null) then raise exception 'Lesson not found or cannot be released.'; end if;
  -- Recover an uncertain response even if the working plan has since changed.
  select id into v_id from public.class_lesson_releases where lesson_id=l.id
    and source_updated_at=p_expected_updated_at and reviewed_materials=p_material_revisions and teacher_id=auth.uid();
  if found then return v_id; end if;
  if l.updated_at <> p_expected_updated_at then raise exception 'Lesson changed. Save and review it again.'; end if;
  if trim(l.objective)='' or right(trim(l.objective),1)='…' or trim(l.success_check)='' then raise exception 'Add a specific learning goal and success check.'; end if;
  for s in select * from public.class_lesson_steps where lesson_id=l.id order by position for share loop
    v_planning := coalesce(s.config -> 'planning', '{}');
    v_homework := coalesce(v_planning ->> 'delivery', case when s.phase='homework' then 'homework' else 'classroom' end)='homework';
    if not v_homework then v_class_minutes := v_class_minutes+s.duration_minutes; v_class_steps := v_class_steps+1; end if;
    if trim(s.student_action)='' or coalesce(trim(v_planning ->> 'purpose'),'')='' then raise exception 'Add student instructions and learning purpose for every step.'; end if;
    if (s.kind='custom' or s.phase='assessment' or v_homework)
      and coalesce(nullif(trim(v_planning ->> 'successCriteria'),''),nullif(trim(s.config ->> 'successCriteria'),''),'')='' then raise exception 'Add success criteria for manual tasks, checks, and homework.'; end if;
    if s.kind='live_game' or (v_homework and s.kind not in ('custom','studio_activity')) then raise exception 'This step does not support pinned delivery yet.'; end if;
    if s.kind='studio_activity' then
      select * into a from public.studio_activities where id=(s.config ->> 'activityId')::uuid and teacher_id=auth.uid() for share;
      if not found or a.format not in ('flashcards','multiple_choice') or a.format is distinct from s.config ->> 'format' then raise exception 'Supported material not found.'; end if;
      if a.updated_at is distinct from (p_material_revisions ->> a.id::text)::timestamptz then raise exception 'Material changed. Preview and review it again.'; end if;
      if jsonb_typeof(a.pack -> 'screens') is distinct from 'array' then raise exception 'Material has no playable screens.'; end if;
      if jsonb_array_length(a.pack -> 'screens')=0 then raise exception 'Material has no playable screens.'; end if;
      v_revisions := v_revisions || jsonb_build_object(a.id::text, p_material_revisions ->> a.id::text);
      v_materials := v_materials || jsonb_build_object(s.id::text, jsonb_build_object('activityId',a.id,'title',a.title,'format',a.format,'pack',a.pack));
    end if;
    v_steps := v_steps || jsonb_build_array(jsonb_build_object('id',s.id,'position',s.position,'kind',s.kind,'title',s.title,
      'phase',s.phase,'durationMinutes',s.duration_minutes,'teacherAction',s.teacher_action,'studentAction',s.student_action,'config',s.config));
  end loop;
  if v_class_steps=0 or v_class_minutes>l.duration_minutes then raise exception 'Prepare a classroom sequence within the lesson time.'; end if;
  if v_revisions<>p_material_revisions then raise exception 'Review the exact materials used by this sequence.'; end if;
  insert into public.class_lesson_releases(lesson_id,class_id,teacher_id,source_updated_at,reviewed_materials,snapshot,created_at)
  values(l.id,l.class_id,auth.uid(),l.updated_at,p_material_revisions,jsonb_build_object(
    'lesson',jsonb_build_object('id',l.id,'classId',l.class_id,'teacherId',l.teacher_id,'title',l.title,'status','ready','notes',l.notes,
      'objective',l.objective,'durationMinutes',l.duration_minutes,'targetLanguage',l.target_language,'successCheck',l.success_check,
      'templateKey',l.template_key,'templateVersion',l.template_version,'publishedAt',l.published_at,'createdAt',l.created_at,'updatedAt',l.updated_at,
      'vocabularySources',l.vocabulary_sources,'steps',v_steps),'materials',v_materials),v_now) returning id into v_id;
  -- Release metadata doesn't edit the reviewed lesson content/revision.
  update public.class_lessons set status='ready',latest_release_id=v_id,released_at=v_now,released_updated_at=l.updated_at where id=l.id;
  return v_id;
end;
$$;
revoke all on function public.release_class_lesson_plan(uuid,timestamptz,jsonb) from public;
grant execute on function public.release_class_lesson_plan(uuid,timestamptz,jsonb) to authenticated;

-- Binding captures one immutable release. Reopening/promoting the same session
-- does not silently switch it to a newer release. Legacy sessions remain valid.
create function public.pin_class_session_lesson_release() returns trigger language plpgsql security definer set search_path=public as $$
declare v_release uuid; v_class uuid; v_teacher uuid;
begin
  if tg_op='UPDATE' and new.class_lesson_id is not distinct from old.class_lesson_id
    and new.class_id is not distinct from old.class_id and new.created_by is not distinct from old.created_by then
    new.lesson_release_id := old.lesson_release_id; return new;
  end if;
  new.lesson_release_id := null;
  if new.class_lesson_id is not null then
    select latest_release_id,class_id,teacher_id into v_release,v_class,v_teacher from public.class_lessons where id=new.class_lesson_id;
    if not found or v_class is distinct from new.class_id or v_teacher is distinct from new.created_by then raise exception 'Lesson does not belong to this classroom.'; end if;
    new.lesson_release_id := v_release;
  end if;
  return new;
end;
$$;
revoke all on function public.pin_class_session_lesson_release() from public;
create trigger class_sessions_pin_lesson_release before insert or update of class_lesson_id,lesson_release_id,class_id,created_by on public.class_sessions
  for each row execute function public.pin_class_session_lesson_release();

-- Atomic, retry-safe assignment. Payload and learner instructions come from the
-- release; private teacher cues/purpose are never projected into the assignment.
create function public.assign_released_lesson_homework(p_release_id uuid,p_step_id uuid,p_due_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.class_lesson_releases%rowtype; s jsonb; m jsonb; p jsonb; v_id uuid;
  v_payload jsonb; v_instructions text;
begin
  if auth.uid() is null or not public.is_teacher() then raise exception 'teacher authentication required'; end if;
  select * into r from public.class_lesson_releases where id=p_release_id and teacher_id=auth.uid();
  if not found or not exists(select 1 from public.teacher_classes where id=r.class_id and teacher_id=auth.uid() and archived_at is null) then raise exception 'Released lesson not found.'; end if;
  -- Serialize assignment retries for this release.
  perform 1 from public.class_lessons where id=r.lesson_id for update;
  select id into v_id from public.class_homework where lesson_release_id=r.id and lesson_step_id=p_step_id and teacher_id=auth.uid();
  if found then return v_id; end if;
  select value into s from jsonb_array_elements(r.snapshot -> 'lesson' -> 'steps') where value ->> 'id'=p_step_id::text;
  p := s -> 'config' -> 'planning';
  if s is null or coalesce(p ->> 'delivery',case when s ->> 'phase'='homework' then 'homework' else 'classroom' end)<>'homework' then raise exception 'Choose a released homework step.'; end if;
  v_instructions := s ->> 'studentAction' || E'\n\nSuccess criteria: ' || coalesce(p ->> 'successCriteria',s -> 'config' ->> 'successCriteria','')
    || E'\n\nExpected effort: ' || (s ->> 'durationMinutes') || ' minutes.'
    || case when coalesce(p ->> 'scaffolding','')<>'' then E'\n\nSupport: ' || (p ->> 'scaffolding') else '' end;
  if s ->> 'kind'='custom' then v_payload := jsonb_build_object('type','external_note','body',s ->> 'studentAction');
  elsif s ->> 'kind'='studio_activity' then
    m := r.snapshot -> 'materials' -> p_step_id::text;
    if m is null then raise exception 'Released material is missing.'; end if;
    v_payload := jsonb_build_object('type','studio_activity','activityId',m ->> 'activityId','format',m ->> 'format','title',m ->> 'title',
      'screenCount',jsonb_array_length(m -> 'pack' -> 'screens'),'pack',m -> 'pack','frozenAt',r.created_at);
  else raise exception 'Unsupported homework delivery.'; end if;
  insert into public.class_homework(class_id,teacher_id,title,instructions,due_at,status,payload,assigned_at,lesson_release_id,lesson_step_id)
    values(r.class_id,auth.uid(),s ->> 'title',v_instructions,p_due_at,'assigned',v_payload,clock_timestamp(),r.id,p_step_id) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.assign_released_lesson_homework(uuid,uuid,timestamptz) from public;
grant execute on function public.assign_released_lesson_homework(uuid,uuid,timestamptz) to authenticated;

create function public.protect_released_homework_content() returns trigger language plpgsql set search_path=public as $$
begin
  if old.lesson_release_id is not null and (new.lesson_release_id is distinct from old.lesson_release_id
    or new.lesson_step_id is distinct from old.lesson_step_id or new.payload is distinct from old.payload
    or new.instructions is distinct from old.instructions or new.class_id is distinct from old.class_id
    or new.teacher_id is distinct from old.teacher_id) then
    raise exception 'Released homework content is frozen. Create a new release for revised material.';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_released_homework_content() from public;
create trigger class_homework_protect_released_content before update on public.class_homework
  for each row execute function public.protect_released_homework_content();

-- Released student outlines follow the same safe projection as legacy plans.
create or replace function public.list_published_class_materials(p_class_id uuid,p_limit integer default 20)
returns table(lesson_id uuid,class_id uuid,lesson_title text,published_at timestamptz,step_id uuid,step_position integer,step_kind text,step_title text,step_phase text,step_duration_minutes integer,step_student_action text)
language sql stable security definer set search_path=public as $$
  with allowed as (
    select l.*,r.snapshot from public.class_lessons l left join public.class_lesson_releases r on r.id=l.latest_release_id
    where public.is_student() and l.class_id=p_class_id and l.published_at is not null
      and exists(select 1 from public.class_enrollments e where e.class_id=l.class_id and e.student_id=auth.uid())
    order by l.published_at desc limit least(greatest(coalesce(p_limit,20),1),50)
  ), projected as (
    select a.id,a.class_id,coalesce(a.snapshot -> 'lesson' ->> 'title',a.title) title,a.published_at,
      s.id step_id,s.position,s.kind,s.title step_title,s.phase,s.duration_minutes,s.student_action from allowed a
      left join public.class_lesson_steps s on s.lesson_id=a.id where a.latest_release_id is null
    union all
    select a.id,a.class_id,a.snapshot -> 'lesson' ->> 'title',a.published_at,(s ->> 'id')::uuid,(s ->> 'position')::integer,
      s ->> 'kind',s ->> 'title',s ->> 'phase',(s ->> 'durationMinutes')::integer,s ->> 'studentAction'
      from allowed a cross join lateral jsonb_array_elements(a.snapshot -> 'lesson' -> 'steps') s where a.latest_release_id is not null
  ) select * from projected order by published_at desc,position asc;
$$;
