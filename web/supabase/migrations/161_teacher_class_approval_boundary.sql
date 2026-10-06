-- Owning a row is not proof of an approved teacher account. Keep ownership
-- boundaries and require the current server-managed Auth role for teacher paths.
alter policy teacher_classes_teacher_select on public.teacher_classes
  using ((select public.is_teacher()) and teacher_id = (select auth.uid()));
alter policy teacher_classes_teacher_insert on public.teacher_classes
  with check ((select public.is_teacher()) and teacher_id = (select auth.uid()));
alter policy teacher_classes_teacher_update on public.teacher_classes
  using ((select public.is_teacher()) and teacher_id = (select auth.uid()))
  with check ((select public.is_teacher()) and teacher_id = (select auth.uid()));

-- Intersect any other permissive write policies; these guards grant no access.
create policy teacher_classes_approved_insert_guard on public.teacher_classes
  as restrictive for insert to authenticated
  with check ((select public.is_teacher()));
create policy teacher_classes_approved_update_guard on public.teacher_classes
  as restrictive for update to authenticated
  using ((select public.is_teacher())) with check ((select public.is_teacher()));

alter policy class_enrollments_teacher_select on public.class_enrollments
  using ((select public.is_teacher()) and exists (
    select 1 from public.teacher_classes tc
    where tc.id = class_id and tc.teacher_id = (select auth.uid())
  ));
alter policy class_enrollments_teacher_delete on public.class_enrollments
  using ((select public.is_teacher()) and exists (
    select 1 from public.teacher_classes tc
    where tc.id = class_id and tc.teacher_id = (select auth.uid())
  ));
-- The student's own-membership SELECT policy is deliberately retained.

create or replace function public.join_class_by_code(p_join_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid := auth.uid();
  v_code text := upper(trim(p_join_code));
  v_class public.teacher_classes%rowtype;
begin
  if v_student_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Check current Auth data rather than a stale JWT role. Hold the account lock
  -- until enrollment commits so a concurrent role change cannot race this check.
  perform 1 from auth.users u
  where u.id = v_student_id and u.raw_app_meta_data->>'role' = 'student'
  for share;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'students_only');
  end if;

  if v_code is null or length(v_code) <> 6 then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  -- A join code grants enrollment only into an active, approved teacher's class.
  -- Locks serialize this insert with archiving, code changes and suspension.
  select tc.* into v_class
  from public.teacher_classes tc join auth.users u on u.id = tc.teacher_id
  where tc.join_code = v_code and tc.archived_at is null
    and (u.raw_app_meta_data->>'role' = 'teacher'
      or lower(u.email) = 'bradydmyers@gmail.com')
    and coalesce(u.raw_app_meta_data->>'teacher_access_status', 'approved') = 'approved'
  for share of tc, u;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  insert into public.class_enrollments (class_id, student_id)
  values (v_class.id, v_student_id) on conflict do nothing;
  return jsonb_build_object('ok', true, 'classId', v_class.id, 'title', v_class.title);
end;
$$;

revoke all on function public.join_class_by_code(text) from public, anon;
grant execute on function public.join_class_by_code(text) to authenticated;
