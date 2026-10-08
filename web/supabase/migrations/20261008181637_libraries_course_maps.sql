-- A course map is an authoring document, not the retired playable-course CMS.
-- Ordered JSON keeps a small editor atomic; stable IDs make later extraction safe.
create table public.curriculum_maps (
  id uuid primary key,
  teacher_id uuid not null references auth.users(id) on delete restrict,
  revision integer not null check (revision > 0),
  archived boolean not null default false,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  updated_at timestamptz not null default now()
);
create index curriculum_maps_owner_updated_idx on public.curriculum_maps(teacher_id, updated_at desc);
create table public.curriculum_map_revisions (
  map_id uuid not null references public.curriculum_maps(id) on delete restrict,
  revision integer not null,
  teacher_id uuid not null references auth.users(id) on delete restrict,
  document jsonb not null,
  source_snapshots jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key(map_id, revision)
);
create table public.curriculum_lesson_imports (
  operation_id uuid primary key,
  teacher_id uuid not null references auth.users(id) on delete restrict,
  map_id uuid not null,
  map_revision integer not null,
  planned_lesson_id uuid not null,
  class_lesson_id uuid not null references public.class_lessons(id) on delete restrict,
  class_id uuid not null references public.teacher_classes(id) on delete restrict,
  provenance jsonb not null,
  created_at timestamptz not null default now(),
  foreign key(map_id, map_revision) references public.curriculum_map_revisions(map_id, revision) on delete restrict
);
create index curriculum_lesson_imports_lesson_idx on public.curriculum_lesson_imports(class_lesson_id);
alter table public.curriculum_maps enable row level security;
alter table public.curriculum_map_revisions enable row level security;
alter table public.curriculum_lesson_imports enable row level security;
create policy curriculum_maps_owner_read on public.curriculum_maps for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());
create policy curriculum_revisions_owner_read on public.curriculum_map_revisions for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());
create policy curriculum_imports_owner_read on public.curriculum_lesson_imports for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());
-- Writes go through guarded transactions, including immutable revision history.
revoke all on public.curriculum_maps, public.curriculum_map_revisions, public.curriculum_lesson_imports from anon, authenticated;
grant select on public.curriculum_maps, public.curriculum_map_revisions, public.curriculum_lesson_imports to authenticated;

create or replace function public.save_curriculum_map(
  p_id uuid, p_expected_revision integer, p_document jsonb, p_archived boolean default false,
  p_grammar_snapshots jsonb default '{}'::jsonb
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_map public.curriculum_maps%rowtype; v_revision integer; v_resource jsonb;
  v_sources jsonb := '{}'::jsonb; v_source jsonb; v_id text; v_kind text;
begin
  if auth.uid() is null or not public.is_teacher() then raise exception 'Teacher authentication required.'; end if;
  if p_expected_revision is null or p_document is null or p_archived is null or
     p_document->>'version' is distinct from '1' or
     nullif(trim(p_document->>'title'), '') is null or length(p_document->>'title') > 120 or
     jsonb_typeof(p_document->'units') is distinct from 'array' or
     jsonb_typeof(p_document->'objectives') is distinct from 'array' or
     jsonb_typeof(p_document->'targets') is distinct from 'array' or
     octet_length(p_document::text) > 2000000 or jsonb_array_length(p_document->'units') > 100 then
    raise exception 'Invalid course map.';
  end if;
  -- Serializes creation as well as uncertain save retries without last-write-wins.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into v_map from public.curriculum_maps where id = p_id for update;
  if found then
    if v_map.teacher_id <> auth.uid() then raise exception 'Course map not found.'; end if;
    if v_map.revision <> p_expected_revision then
      if p_expected_revision = 0 and v_map.document = p_document and v_map.archived = p_archived then return v_map.revision; end if;
      raise exception 'This map changed in another session. Reload before saving; your unsaved work is still on screen.';
    end if;
    v_revision := v_map.revision + 1;
  else
    if p_expected_revision <> 0 then raise exception 'Course map not found.'; end if;
    v_revision := 1;
  end if;
  for v_resource in
    select distinct r.value from jsonb_array_elements(p_document->'units') u
      cross join lateral jsonb_array_elements(u->'lessons') l
      cross join lateral jsonb_array_elements(l->'resources') r
  loop
    v_id := v_resource->>'sourceId'; v_kind := v_resource->>'kind'; v_source := null;
    if v_kind in ('activity', 'vocabulary_list') then
      -- Ownership is checked even though SECURITY DEFINER bypasses RLS.
      select jsonb_build_object('id', a.id, 'title', a.title, 'format', a.format, 'authoring', a.authoring,
        'pack', a.pack, 'updatedAt', a.updated_at) into v_source
        from public.studio_activities a where a.id::text = v_id and a.teacher_id = auth.uid()
          and ((v_kind = 'vocabulary_list' and a.format = 'vocabulary_list') or (v_kind = 'activity' and a.format <> 'vocabulary_list')) for share;
    elsif v_kind = 'media' then
      select jsonb_build_object('id', a.id, 'title', a.original_filename, 'publicUrl', a.public_url, 'updatedAt', a.created_at)
        into v_source from public.media_assets a where a.id::text = v_id for share;
    elsif v_kind = 'grammar' then
      if v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid grammar reference.'; end if;
      v_source := p_grammar_snapshots->v_id;
    end if;
    if v_source is null then raise exception 'A linked resource is unavailable. Refresh resources and remove or replace the link.'; end if;
    v_sources := v_sources || jsonb_build_object(v_kind || ':' || v_id, v_source);
  end loop;
  insert into public.curriculum_maps(id, teacher_id, revision, document, archived)
    values(p_id, auth.uid(), v_revision, p_document, p_archived)
    on conflict(id) do update set revision = v_revision, document = p_document, archived = p_archived, updated_at = clock_timestamp();
  insert into public.curriculum_map_revisions(map_id, revision, teacher_id, document, source_snapshots)
    values(p_id, v_revision, auth.uid(), p_document, v_sources);
  return v_revision;
end;
$$;

create or replace function public.import_curriculum_lesson(
  p_operation_id uuid, p_map_id uuid, p_revision integer, p_planned_lesson_id uuid,
  p_class_id uuid, p_existing_lesson_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_retry public.curriculum_lesson_imports%rowtype; v_revision public.curriculum_map_revisions%rowtype;
  v_lesson jsonb; v_objectives text; v_check text; v_resource jsonb; v_source jsonb;
  v_sources jsonb := '[]'::jsonb; v_list_id uuid; v_lesson_id uuid; v_authoring jsonb; v_entries jsonb;
  v_provenance jsonb; v_notes text; v_steps jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_teacher() then raise exception 'Teacher authentication required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_operation_id::text, 1));
  select * into v_retry from public.curriculum_lesson_imports where operation_id = p_operation_id;
  if found then
    if v_retry.teacher_id <> auth.uid() or v_retry.map_id <> p_map_id or v_retry.map_revision <> p_revision or
       v_retry.planned_lesson_id <> p_planned_lesson_id or v_retry.class_id <> p_class_id or
       (p_existing_lesson_id is not null and v_retry.class_lesson_id <> p_existing_lesson_id) then
      raise exception 'This operation was already used for different inputs.';
    end if;
    return v_retry.class_lesson_id;
  end if;
  perform 1 from public.teacher_classes where id = p_class_id and teacher_id = auth.uid() and archived_at is null for share;
  if not found then raise exception 'Active class not found.'; end if;
  select r.* into v_revision from public.curriculum_map_revisions r
    join public.curriculum_maps m on m.id = r.map_id
    where r.map_id = p_map_id and r.revision = p_revision and r.teacher_id = auth.uid() and not m.archived;
  if not found then raise exception 'Course revision not found or archived.'; end if;
  select l into v_lesson from jsonb_array_elements(v_revision.document->'units') u
    cross join lateral jsonb_array_elements(u->'lessons') l
    where l->>'id' = p_planned_lesson_id::text and (u->>'archived')::boolean = false and (l->>'archived')::boolean = false;
  if v_lesson is null then raise exception 'Planned lesson not found or archived.'; end if;
  v_provenance := jsonb_build_object('mapId', p_map_id, 'mapTitle', v_revision.document->>'title',
    'revision', p_revision, 'plannedLessonId', p_planned_lesson_id, 'importedAt', clock_timestamp(),
    'resources', v_lesson->'resources');
  if p_existing_lesson_id is not null then
    perform 1 from public.class_lessons where id = p_existing_lesson_id and class_id = p_class_id
      and teacher_id = auth.uid() and status <> 'archived' for update;
    if not found then raise exception 'Editable class lesson not found.'; end if;
    v_lesson_id := p_existing_lesson_id;
  else
    select string_agg(o->>'statement', E'\n' order by n.ordinality), string_agg(o->>'successCriteria', E'\n' order by n.ordinality)
      into v_objectives, v_check from jsonb_array_elements_text(v_lesson->'objectiveIds') with ordinality n(value, ordinality)
      join lateral jsonb_array_elements(v_revision.document->'objectives') o on o->>'id' = n.value;
    if length(v_objectives) > 1000 or length(v_check) > 1000 then
      raise exception 'Shorten the combined learning objectives and success criteria to 1,000 characters each before importing.';
    end if;
    for v_resource in select value from jsonb_array_elements(v_lesson->'resources') where value->>'kind' = 'vocabulary_list' loop
      v_source := v_revision.source_snapshots->('vocabulary_list:' || (v_resource->>'sourceId'));
      v_authoring := v_source->'authoring';
      if v_authoring->>'kind' is distinct from 'vocabulary-list' or jsonb_typeof(v_authoring->'entries') is distinct from 'array' then
        raise exception 'A vocabulary source is invalid. Edit the list and save a new map revision.';
      end if;
      if jsonb_array_length(v_resource->'selectedEntryIds') > 0 then
        select coalesce(jsonb_agg(e.value order by e.ordinality), '[]'::jsonb) into v_entries
          from jsonb_array_elements(v_authoring->'entries') with ordinality e(value, ordinality)
          where v_resource->'selectedEntryIds' ? (e.value->>'id');
        if jsonb_array_length(v_entries) <> jsonb_array_length(v_resource->'selectedEntryIds') then raise exception 'Some selected vocabulary entries are unavailable in this revision.'; end if;
        v_authoring := jsonb_set(v_authoring, '{entries}', v_entries);
      end if;
      -- Always copy the frozen source: later source edits cannot change this plan.
      v_list_id := gen_random_uuid();
      v_authoring := jsonb_set(v_authoring, '{id}', to_jsonb(v_list_id::text));
      insert into public.studio_activities(id, teacher_id, format, title, authoring, pack, source)
        values(v_list_id, auth.uid(), 'vocabulary_list', v_source->>'title', v_authoring,
          jsonb_build_object('version', 1, 'kind', 'vocabulary-list-pack', 'id', v_list_id, 'name', v_source->>'title', 'entry_count', jsonb_array_length(v_authoring->'entries')),
          jsonb_build_object('via', 'course_map', 'mapId', p_map_id, 'revision', p_revision, 'sourceId', v_resource->>'sourceId'));
      v_sources := v_sources || jsonb_build_array(jsonb_build_object('vocabListId', v_list_id, 'name', v_source->>'title'));
    end loop;
    if nullif(trim(v_lesson->>'teacherTask'), '') is not null then
      v_steps := jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'kind', 'custom', 'title', 'Learning task',
        'phase', 'independent_practice', 'durationMinutes', 5, 'teacherAction', v_lesson->>'teacherTask', 'studentAction', v_lesson->>'teacherTask',
        'config', jsonb_build_object('materialNote', '', 'planning', jsonb_build_object('delivery', 'classroom', 'purpose', coalesce(v_objectives, ''),
          'successCriteria', coalesce(v_check, ''), 'grouping', 'individual', 'scaffolding', coalesce(v_lesson->>'support', '')))));
    end if;
    v_lesson_id := public.create_class_lesson_plan_with_vocabulary(p_class_id, v_lesson->>'title',
      left(coalesce(v_objectives, ''), 1000), (v_lesson->>'durationMinutes')::integer,
      left(coalesce(v_lesson->>'targetLanguage', ''), 1500), left(coalesce(v_check, ''), 1000), 'blank', 1, v_steps, v_sources);
    v_notes := concat_ws(E'\n\n', nullif('Support: ' || nullif(v_lesson->>'support', ''), ''),
      nullif('Extension: ' || nullif(v_lesson->>'extension', ''), ''));
    update public.class_lessons set notes = left(v_notes, 4000) where id = v_lesson_id;
  end if;
  insert into public.curriculum_lesson_imports(operation_id, teacher_id, map_id, map_revision, planned_lesson_id, class_lesson_id, class_id, provenance)
    values(p_operation_id, auth.uid(), p_map_id, p_revision, p_planned_lesson_id, v_lesson_id, p_class_id, v_provenance);
  return v_lesson_id;
end;
$$;
revoke all on function public.save_curriculum_map(uuid,integer,jsonb,boolean,jsonb) from public;
revoke all on function public.import_curriculum_lesson(uuid,uuid,integer,uuid,uuid,uuid) from public;
grant execute on function public.save_curriculum_map(uuid,integer,jsonb,boolean,jsonb) to authenticated;
grant execute on function public.import_curriculum_lesson(uuid,uuid,integer,uuid,uuid,uuid) to authenticated;
