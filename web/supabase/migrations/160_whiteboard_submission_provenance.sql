-- Server-established authorship, separate from participant-editable room storage.
alter table public.whiteboard_rounds add column authority_pending boolean not null default false;
create table public.whiteboard_round_participants (
  round_id text not null references public.whiteboard_rounds(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('host','player')),
  joined_at timestamptz not null default now(),
  primary key (round_id,user_id)
);
create table public.whiteboard_board_authority (
  round_id text not null references public.whiteboard_rounds(id) on delete cascade,
  board_id text not null,
  owner_type text not null check (owner_type in ('teacher','student','group')),
  owner_id text not null,
  contributor_ids text[] not null default '{}',
  primary key (round_id,board_id)
);
alter table public.whiteboard_round_participants enable row level security;
alter table public.whiteboard_board_authority enable row level security;
revoke all on public.whiteboard_round_participants,public.whiteboard_board_authority from public,anon,authenticated;
grant all on public.whiteboard_round_participants,public.whiteboard_board_authority to service_role;
create policy teacher_account_access_guard on public.whiteboard_round_participants as restrictive
  to authenticated using ((select public.teacher_account_access_allowed()))
  with check ((select public.teacher_account_access_allowed()));
create policy teacher_account_access_guard on public.whiteboard_board_authority as restrictive
  to authenticated using ((select public.teacher_account_access_allowed()))
  with check ((select public.teacher_account_access_allowed()));

-- Internal helper. Auth metadata and current enrollment win over stored membership.
create function public.whiteboard_current_actor_role(p_round_id text,p_actor_id text)
returns text language plpgsql stable security definer set search_path = public,pg_temp as $$
declare r public.whiteboard_rounds; u auth.users; member_role text;
begin
  select * into r from public.whiteboard_rounds where id=p_round_id;
  if not found or p_actor_id is null then return null; end if;
  select * into u from auth.users where id::text=p_actor_id;
  if found then
    if u.raw_app_meta_data->>'role'='teacher' or lower(u.email)='bradydmyers@gmail.com' then
      if coalesce(u.raw_app_meta_data->>'teacher_access_status','approved')<>'approved' then return null; end if;
      if p_actor_id=r.host_user_id and u.raw_app_meta_data->>'teacher_tier'='plus'
        and (r.class_id is null or exists(select 1 from public.teacher_classes
          where id=r.class_id and teacher_id=u.id)) then return 'host'; end if;
      if r.class_id is not null then return null; end if;
    elsif coalesce(u.raw_app_meta_data->>'role','')<>'student' then return null;
    end if;
    if r.class_id is not null and not exists(select 1 from public.class_enrollments ce
      join public.teacher_classes tc on tc.id=ce.class_id
      where ce.class_id=r.class_id and ce.student_id=u.id and tc.archived_at is null) then return null; end if;
  elsif r.class_id is not null or p_actor_id !~ '^whiteboard_guest_[0-9a-f-]{36}$' then return null;
  end if;
  select role into member_role from public.whiteboard_round_participants
    where round_id=r.id and user_id=p_actor_id;
  return case when member_role='player' then 'player' else null end;
end $$;
revoke all on function public.whiteboard_current_actor_role(text,text) from public,anon,authenticated;
grant execute on function public.whiteboard_current_actor_role(text,text) to service_role;

create function public.register_whiteboard_participant(p_room_id text,p_user_id text,p_role text)
returns void language plpgsql security definer set search_path = public,pg_temp as $$
declare r public.whiteboard_rounds; u auth.users; board text;
begin
  select * into r from public.whiteboard_rounds where liveblocks_room_id=p_room_id
    order by updated_at desc limit 1 for update;
  if p_user_id is null or not found or r.phase='ENDED' or r.archived_at is not null then raise exception 'Whiteboard is unavailable'; end if;
  if r.class_id is not null and exists(select 1 from public.teacher_classes
    where id=r.class_id and archived_at is not null) then raise exception 'Class is archived'; end if;
  if p_role='host' then
    if public.whiteboard_current_actor_role(r.id,p_user_id) is distinct from 'host' then raise exception 'Host access required'; end if;
  elsif p_role='player' then
    select * into u from auth.users where id::text=p_user_id;
    if found then
      if r.class_id is not null then
        if u.raw_app_meta_data->>'role' is distinct from 'student' or not exists(select 1
          from public.class_enrollments where class_id=r.class_id and student_id=u.id) then raise exception 'Enrollment required'; end if;
      elsif (coalesce(u.raw_app_meta_data->>'role','') not in ('student','teacher') and lower(u.email)<>'bradydmyers@gmail.com')
        or ((u.raw_app_meta_data->>'role'='teacher' or lower(u.email)='bradydmyers@gmail.com') and
          coalesce(u.raw_app_meta_data->>'teacher_access_status','approved')<>'approved') then raise exception 'Account access required'; end if;
    elsif r.class_id is not null or p_user_id !~ '^whiteboard_guest_[0-9a-f-]{36}$' then raise exception 'Invalid participant'; end if;
  else raise exception 'Invalid participant role'; end if;
  insert into public.whiteboard_round_participants(round_id,user_id,role) values(r.id,p_user_id,p_role)
    on conflict(round_id,user_id) do update set role=excluded.role;
  board := case when p_role='host' then 'board:teacher' else 'board:student:'||p_user_id end;
  insert into public.whiteboard_board_authority values(r.id,board,
    case when p_role='host' then 'teacher' else 'student' end,p_user_id,
    case when p_role='host' then '{}'::text[] else array[p_user_id] end)
    on conflict(round_id,board_id) do nothing;
end $$;
revoke all on function public.register_whiteboard_participant(text,text,text) from public,anon,authenticated;
grant execute on function public.register_whiteboard_participant(text,text,text) to service_role;

create function public.register_whiteboard_groups(p_room_id text,p_actor_id text,p_groups jsonb)
returns void language plpgsql security definer set search_path = public,pg_temp as $$
declare r public.whiteboard_rounds; g jsonb; gid text; members text[]; assigned text[] := '{}'; group_ids text[] := '{}';
begin
  select * into r from public.whiteboard_rounds where liveblocks_room_id=p_room_id
    order by updated_at desc limit 1 for update;
  if not found or r.phase='ENDED' or r.archived_at is not null or
    public.whiteboard_current_actor_role(r.id,p_actor_id) is distinct from 'host' then raise exception 'Host access required'; end if;
  if r.class_id is not null and exists(select 1 from public.teacher_classes
    where id=r.class_id and archived_at is not null) then raise exception 'Class is archived'; end if;
  if jsonb_typeof(p_groups) is distinct from 'array' then raise exception 'Groups required'; end if;
  update public.whiteboard_rounds set authority_pending=true where id=r.id;
  delete from public.whiteboard_board_authority where round_id=r.id and owner_type='group';
  for g in select value from jsonb_array_elements(p_groups) loop
    gid := g->>'id';
    if gid is null or length(gid) not between 1 and 100 or gid=any(group_ids) or jsonb_typeof(g->'memberIds') is distinct from 'array' then raise exception 'Invalid group'; end if;
    select array_agg(distinct value order by value) into members from jsonb_array_elements_text(g->'memberIds');
    if coalesce(cardinality(members),0)=0 or members && assigned or exists(select 1 from unnest(members) m
      where not exists(select 1 from public.whiteboard_round_participants where round_id=r.id and user_id=m and role='player')
        or public.whiteboard_current_actor_role(r.id,m) is null) then
      raise exception 'Groups require distinct joined participants'; end if;
    assigned := assigned || members;
    group_ids := group_ids || gid;
    insert into public.whiteboard_board_authority values(r.id,'board:group:'||gid,'group',gid,members)
      on conflict(round_id,board_id) do update set contributor_ids=excluded.contributor_ids;
  end loop;
end $$;
revoke all on function public.register_whiteboard_groups(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.register_whiteboard_groups(text,text,jsonb) to service_role;

-- A failed provider mutation keeps collection blocked until the teacher retries.
create function public.confirm_whiteboard_groups(p_room_id text,p_actor_id text)
returns void language plpgsql security definer set search_path = public,pg_temp as $$
declare r public.whiteboard_rounds;
begin
  select * into r from public.whiteboard_rounds where liveblocks_room_id=p_room_id order by updated_at desc limit 1 for update;
  if not found or public.whiteboard_current_actor_role(r.id,p_actor_id) is distinct from 'host' then raise exception 'Host access required'; end if;
  update public.whiteboard_rounds set authority_pending=false where id=r.id;
end $$;
revoke all on function public.confirm_whiteboard_groups(text,text) from public,anon,authenticated;
grant execute on function public.confirm_whiteboard_groups(text,text) to service_role;

create function public.whiteboard_submission_context(p_room_id text,p_actor_id text,p_board_id text)
returns jsonb language plpgsql stable security definer set search_path = public,pg_temp as $$
declare r public.whiteboard_rounds; b public.whiteboard_board_authority; actor_role text;
begin
  select * into r from public.whiteboard_rounds where liveblocks_room_id=p_room_id order by updated_at desc limit 1;
  actor_role := public.whiteboard_current_actor_role(r.id,p_actor_id);
  if actor_role is null then raise exception 'Whiteboard access required'; end if;
  if r.authority_pending then raise exception 'Retry group assignment before submitting'; end if;
  select * into b from public.whiteboard_board_authority where round_id=r.id and board_id=p_board_id;
  if not found or b.owner_type='teacher' then raise exception 'Student board authority required'; end if;
  if actor_role='player' and (not p_actor_id=any(b.contributor_ids) or r.phase not in ('OPEN','PAUSED','REVISION')) then
    raise exception 'Not your open board'; end if;
  return jsonb_build_object('roundId',r.id,'boardId',b.board_id,'ownerType',b.owner_type,
    'ownerId',b.owner_id,'contributorIds',b.contributor_ids,'actorRole',actor_role);
end $$;
revoke all on function public.whiteboard_submission_context(text,text,text) from public,anon,authenticated;
grant execute on function public.whiteboard_submission_context(text,text,text) to service_role;

create function public.persist_whiteboard_submission(p_room_id text,p_actor_id text,p_board_id text,
  p_revision integer,p_submission_type text,p_document jsonb,p_preview_path text default null)
returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare c jsonb; r public.whiteboard_rounds; actor_role text; contributors text[]; doc jsonb; old public.whiteboard_submissions;
begin
  -- Lock the canonical round, so group changes and saves cannot race inside SQL.
  select * into r from public.whiteboard_rounds where liveblocks_room_id=p_room_id
    order by updated_at desc limit 1 for update;
  if not found then raise exception 'Whiteboard access required'; end if;
  actor_role := public.whiteboard_current_actor_role(r.id,p_actor_id);
  if actor_role is null then raise exception 'Whiteboard access required'; end if;
  if r.authority_pending then raise exception 'Retry group assignment before submitting'; end if;
  if p_revision<1 or p_revision is null or jsonb_typeof(p_document) is distinct from 'object' or
    p_submission_type not in ('manual','teacher_pull','timer_expiry') or p_submission_type is null then raise exception 'Invalid submission'; end if;
  if actor_role='player' and (p_submission_type<>'manual' or r.phase not in ('OPEN','PAUSED','REVISION')) then raise exception 'Not your open board'; end if;
  if p_preview_path is not null and p_preview_path <> r.id||'/'||p_board_id||'/r'||p_revision||'.png' then
    raise exception 'Invalid preview path'; end if;
  select * into old from public.whiteboard_submissions
    where round_id=r.id and board_id=p_board_id and revision=p_revision for update;
  if found then
    -- Reassignment never transfers credit on an already recorded revision.
    if actor_role='player' and not p_actor_id=any(old.contributor_ids) then raise exception 'Not your recorded work'; end if;
    doc := p_document || jsonb_build_object('id',old.board_id,'ownerType',old.owner_type,'ownerId',old.owner_id,'revision',old.revision);
    if old.document_json<>doc then raise exception 'Cannot rewrite recorded submission'; end if;
    if p_preview_path is not null then update public.whiteboard_submissions set preview_path=p_preview_path where id=old.id; end if;
    return jsonb_build_object('roundId',r.id,'boardId',old.board_id,'ownerType',old.owner_type,
      'ownerId',old.owner_id,'contributorIds',old.contributor_ids,'actorRole',actor_role,
      'previewPath',coalesce(p_preview_path,old.preview_path));
  end if;
  c := public.whiteboard_submission_context(p_room_id,p_actor_id,p_board_id);
  select array_agg(value order by value) into contributors from jsonb_array_elements_text(c->'contributorIds');
  doc := p_document || jsonb_build_object('id',p_board_id,'ownerType',c->>'ownerType','ownerId',c->>'ownerId','revision',p_revision);
  insert into public.whiteboard_submissions(id,round_id,liveblocks_room_id,board_id,owner_type,owner_id,
    contributor_ids,revision,submission_type,document_json,preview_path)
  values(r.id||':'||p_board_id||':'||p_revision,r.id,p_room_id,p_board_id,
    c->>'ownerType',c->>'ownerId',contributors,p_revision,p_submission_type,doc,p_preview_path);
  return c || jsonb_build_object('previewPath',p_preview_path);
end $$;
revoke all on function public.persist_whiteboard_submission(text,text,text,integer,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.persist_whiteboard_submission(text,text,text,integer,text,jsonb,text) to service_role;
