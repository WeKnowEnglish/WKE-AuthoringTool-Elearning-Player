-- Preserve existing grants explicitly before changing the application's tier default.
-- Account state lives in server-managed Auth app metadata, not user-editable metadata.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'teacher_tier', case when raw_app_meta_data->>'teacher_tier' in ('light','plus')
      then raw_app_meta_data->>'teacher_tier' else 'plus' end,
    'teacher_access_status', coalesce(raw_app_meta_data->>'teacher_access_status','approved')
  )
where raw_app_meta_data->>'role' = 'teacher' or lower(email) = 'bradydmyers@gmail.com';

-- Read current account state, rather than stale signed JWT metadata.
create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from auth.users u where u.id = auth.uid()
      and (u.raw_app_meta_data->>'role' = 'teacher'
        or lower(u.email) = 'bradydmyers@gmail.com')
      and coalesce(u.raw_app_meta_data->>'teacher_access_status','approved') = 'approved'
  );
$$;

create or replace function public.is_teacher_communication_user()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_teacher();
$$;

create or replace function public.teacher_is_conversation_member(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_teacher() and exists (
    select 1 from public.teacher_conversation_members m
    where m.conversation_id = p_conversation_id and m.user_id = auth.uid()
  );
$$;

-- Owner-only policies and legacy JWT policies must also deny suspended accounts.
-- Student and visitor behavior is preserved. Deleted/demoted teacher tokens fail closed.
create function public.teacher_account_access_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then true
    when auth.jwt()->'app_metadata'->>'role' = 'teacher'
      or exists (select 1 from auth.users u where u.id = auth.uid()
        and (u.raw_app_meta_data->>'role' = 'teacher' or lower(u.email) = 'bradydmyers@gmail.com'))
      then public.is_teacher()
    else exists (select 1 from auth.users u where u.id = auth.uid())
  end;
$$;
revoke all on function public.teacher_account_access_allowed() from public;
grant execute on function public.teacher_account_access_allowed() to anon, authenticated, service_role;

-- A restrictive policy intersects existing ownership/privacy policies; it grants nothing.
-- Include upload and realtime authorization where those schemas are present.
do $$ declare r record; begin
  for r in select n.nspname, c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relrowsecurity and c.relkind in ('r','p')
      and (n.nspname = 'public' or (n.nspname,c.relname) in
        (('storage','objects'),('realtime','messages')))
  loop
    execute format('create policy teacher_account_access_guard on %I.%I as restrictive
      for all to authenticated using ((select public.teacher_account_access_allowed()))
      with check ((select public.teacher_account_access_allowed()))',r.nspname,r.relname);
  end loop;
end $$;

-- Only the trusted admin server action can execute this operation. Account state and
-- audit history commit together, preserving passwords, classes and learning history.
-- Prevent concurrent password/tier operations with stale metadata from restoring access.
create function public.guard_teacher_access_metadata()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.raw_app_meta_data->>'teacher_access_status' is not null
    and (new.raw_app_meta_data->>'teacher_access_status') is distinct from
      (old.raw_app_meta_data->>'teacher_access_status')
    and coalesce(current_setting('wke.teacher_access_target',true),'') <> old.id::text then
    raise exception 'Use the audited teacher access operation to change account state';
  end if;
  return new;
end;
$$;
create trigger guard_teacher_access_metadata before update of raw_app_meta_data on auth.users
  for each row execute function public.guard_teacher_access_metadata();
revoke all on function public.guard_teacher_access_metadata() from public, anon, authenticated;

create function public.set_teacher_account_access(p_actor_id uuid,p_teacher_id uuid,p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor auth.users; v_teacher auth.users; v_previous text; v_previous_target text;
begin
  if p_status is null or p_status not in ('approved','suspended') then
    raise exception 'Choose approved or suspended access';
  end if;
  if p_actor_id = p_teacher_id then raise exception 'You cannot change your own access'; end if;
  select * into v_actor from auth.users where id = p_actor_id;
  if not found or (v_actor.raw_app_meta_data->>'role' is distinct from 'teacher'
      and lower(coalesce(v_actor.email,'')) <> 'bradydmyers@gmail.com')
    or coalesce(v_actor.raw_app_meta_data->>'teacher_access_status','approved') <> 'approved'
    or (lower(coalesce(v_actor.raw_app_meta_data->>'admin','')) not in ('true','1')
      and lower(coalesce(v_actor.email,'')) <> 'bradydmyers@gmail.com') then
    raise exception 'Admin access required';
  end if;
  select * into v_teacher from auth.users where id = p_teacher_id for update;
  if not found or v_teacher.raw_app_meta_data->>'role' is distinct from 'teacher' then
    raise exception 'Teacher account not found';
  end if;
  if lower(coalesce(v_teacher.raw_app_meta_data->>'admin','')) in ('true','1')
    or lower(coalesce(v_teacher.email,'')) = 'bradydmyers@gmail.com' then
    raise exception 'Administrator access must be managed separately';
  end if;
  v_previous := coalesce(v_teacher.raw_app_meta_data->>'teacher_access_status','approved');
  if v_previous not in ('approved','suspended') then
    raise exception 'Review pending access through the application queue';
  end if;
  if v_previous = p_status then return; end if;
  v_previous_target := current_setting('wke.teacher_access_target',true);
  perform set_config('wke.teacher_access_target',p_teacher_id::text,true);
  update auth.users set raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object('teacher_access_status',p_status)
    where id = p_teacher_id;
  insert into public.admin_audit_log(actor_user_id,action,target_type,target_id,target_email,metadata)
    values (p_actor_id,'teacher_access_' || p_status,'teacher',p_teacher_id::text,v_teacher.email,
      jsonb_build_object('previousStatus',v_previous,'status',p_status));
  perform set_config('wke.teacher_access_target',coalesce(v_previous_target,''),true);
end;
$$;
revoke all on function public.set_teacher_account_access(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.set_teacher_account_access(uuid,uuid,text) to service_role;
