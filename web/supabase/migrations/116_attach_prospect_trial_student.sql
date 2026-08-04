-- Attach a newly created student to a pending prospect trial booking + link guardian.

create or replace function public.attach_student_to_pending_trial_booking(
  p_booking_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher uuid := auth.uid();
  v_booking public.trial_booking_requests%rowtype;
begin
  if v_teacher is null or not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'teacher_only');
  end if;

  if p_student_id is null then
    return jsonb_build_object('ok', false, 'error', 'student_required');
  end if;

  select * into v_booking
  from public.trial_booking_requests
  where id = p_booking_id
  for update;

  if not found or v_booking.teacher_id <> v_teacher then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_booking.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  if v_booking.student_id is not null then
    if v_booking.student_id = p_student_id then
      return jsonb_build_object('ok', true, 'studentId', v_booking.student_id, 'alreadyAttached', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'already_has_student');
  end if;

  if p_student_id = v_booking.guardian_user_id then
    return jsonb_build_object('ok', false, 'error', 'student_cannot_guard_self');
  end if;

  if not exists (
    select 1 from public.student_profiles sp where sp.user_id = p_student_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'student_profile_missing');
  end if;

  update public.trial_booking_requests
  set student_id = p_student_id, updated_at = now()
  where id = v_booking.id;

  insert into public.student_guardians (
    student_id,
    guardian_user_id,
    relationship_type,
    status,
    source_invitation_id,
    invited_by,
    activated_at,
    revoked_at,
    revoked_by,
    updated_at
  ) values (
    p_student_id,
    v_booking.guardian_user_id,
    'parent',
    'active',
    null,
    v_teacher,
    now(),
    null,
    null,
    now()
  )
  on conflict (student_id, guardian_user_id) do update
    set status = 'active',
        relationship_type = excluded.relationship_type,
        invited_by = excluded.invited_by,
        activated_at = coalesce(public.student_guardians.activated_at, excluded.activated_at),
        revoked_at = null,
        revoked_by = null,
        updated_at = excluded.updated_at;

  insert into public.guardian_audit_log (
    actor_user_id,
    student_id,
    guardian_user_id,
    action
  ) values (
    v_teacher,
    p_student_id,
    v_booking.guardian_user_id,
    'trial_prospect_guardian_linked'
  );

  return jsonb_build_object('ok', true, 'studentId', p_student_id);
end;
$$;

grant execute on function public.attach_student_to_pending_trial_booking(uuid, uuid) to authenticated;
