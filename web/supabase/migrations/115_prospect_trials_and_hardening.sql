-- Slice D: harden trial bookings + prospect leads + teacher space trials opt-in

-- ─── teacher_spaces: accepting trials ───────────────────────────────────────
alter table public.teacher_spaces
  add column if not exists trials_enabled boolean not null default false;

comment on column public.teacher_spaces.trials_enabled is
  'When true (and space is published), parents can discover and book trial slots for this teacher.';

create index if not exists teacher_spaces_trials_published_idx
  on public.teacher_spaces (handle)
  where is_published = true and trials_enabled = true;

-- ─── Prospect-friendly booking columns ────────────────────────────────────
alter table public.trial_booking_requests
  alter column student_id drop not null;

alter table public.trial_booking_requests
  add column if not exists child_age_band text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trial_booking_requests_child_age_band_len'
  ) then
    alter table public.trial_booking_requests
      add constraint trial_booking_requests_child_age_band_len
      check (child_age_band is null or char_length(trim(child_age_band)) between 1 and 40);
  end if;
end $$;

alter table public.trial_occurrences
  alter column student_id drop not null;

-- ─── Harden: browse open slots for any signed-in user (prospects) ─────────
drop policy if exists teacher_availability_slots_guardian_open_select on public.teacher_availability_slots;
create policy teacher_availability_slots_open_authenticated_select
  on public.teacher_availability_slots for select to authenticated
  using (status = 'open' and starts_at > now());

-- Mutations go through security-definer RPCs only.
drop policy if exists trial_booking_requests_guardian_insert on public.trial_booking_requests;
drop policy if exists trial_booking_requests_guardian_update on public.trial_booking_requests;
drop policy if exists trial_booking_requests_teacher_update on public.trial_booking_requests;

revoke insert, update, delete on public.trial_booking_requests from authenticated;
grant select on public.trial_booking_requests to authenticated;

revoke insert on public.trial_occurrences from authenticated;
grant select on public.trial_occurrences to authenticated;

drop policy if exists trial_occurrences_teacher_insert on public.trial_occurrences;

-- Guardians / booking parents can still read their rows (including prospect, no student).
drop policy if exists trial_booking_requests_guardian_select on public.trial_booking_requests;
create policy trial_booking_requests_guardian_select
  on public.trial_booking_requests for select to authenticated
  using (
    guardian_user_id = auth.uid()
    or (student_id is not null and public.is_active_guardian(student_id))
  );

drop policy if exists trial_occurrences_guardian_select on public.trial_occurrences;
create policy trial_occurrences_guardian_select
  on public.trial_occurrences for select to authenticated
  using (
    guardian_user_id = auth.uid()
    or (student_id is not null and public.is_active_guardian(student_id))
  );

-- ─── Replace request RPC (linked child OR prospect) ───────────────────────
drop function if exists public.request_trial_booking(uuid, uuid, text);

create or replace function public.request_trial_booking(
  p_availability_slot_id uuid,
  p_student_id uuid default null,
  p_guardian_note text default null,
  p_child_display_name text default null,
  p_child_age_band text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guardian uuid := auth.uid();
  v_slot public.teacher_availability_slots%rowtype;
  v_name text;
  v_note text := nullif(trim(coalesce(p_guardian_note, '')), '');
  v_age text := nullif(trim(coalesce(p_child_age_band, '')), '');
  v_booking_id uuid;
  v_student uuid := p_student_id;
begin
  if v_guardian is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_note is not null and char_length(v_note) > 400 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
  end if;

  if v_age is not null and char_length(v_age) > 40 then
    return jsonb_build_object('ok', false, 'error', 'age_band_invalid');
  end if;

  if v_student is not null then
    if not public.is_active_guardian(v_student) then
      return jsonb_build_object('ok', false, 'error', 'not_guardian');
    end if;
    select coalesce(nullif(trim(sp.display_name), ''), sp.username, 'Student')
      into v_name
    from public.student_profiles sp
    where sp.user_id = v_student;
    v_name := coalesce(v_name, 'Student');
  else
    v_name := nullif(trim(coalesce(p_child_display_name, '')), '');
    if v_name is null or char_length(v_name) < 2 then
      return jsonb_build_object('ok', false, 'error', 'child_name_required');
    end if;
    if char_length(v_name) > 120 then
      return jsonb_build_object('ok', false, 'error', 'child_name_too_long');
    end if;
  end if;

  select * into v_slot
  from public.teacher_availability_slots
  where id = p_availability_slot_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'slot_not_found');
  end if;

  if v_slot.status <> 'open' or v_slot.starts_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
  end if;

  if exists (
    select 1 from public.trial_booking_requests
    where availability_slot_id = v_slot.id and status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'error', 'slot_pending');
  end if;

  insert into public.parent_profiles(user_id, display_name)
  values (v_guardian, left(coalesce(v_name, 'Parent'), 120))
  on conflict (user_id) do nothing;

  insert into public.trial_booking_requests (
    teacher_id,
    availability_slot_id,
    guardian_user_id,
    student_id,
    student_display_name,
    child_age_band,
    status,
    guardian_note
  )
  values (
    v_slot.teacher_id,
    v_slot.id,
    v_guardian,
    v_student,
    left(v_name, 120),
    v_age,
    'pending',
    v_note
  )
  returning id into v_booking_id;

  update public.teacher_availability_slots
  set status = 'held', updated_at = now()
  where id = v_slot.id;

  return jsonb_build_object('ok', true, 'bookingId', v_booking_id);
end;
$$;

-- Confirm: enroll only when a real student_id exists.
create or replace function public.confirm_trial_booking(
  p_booking_id uuid,
  p_teacher_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher uuid := auth.uid();
  v_booking public.trial_booking_requests%rowtype;
  v_slot public.teacher_availability_slots%rowtype;
  v_note text := nullif(trim(coalesce(p_teacher_note, '')), '');
  v_class_id uuid;
  v_occurrence_id uuid;
  v_title text;
begin
  if v_teacher is null or not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'teacher_only');
  end if;

  if v_note is not null and char_length(v_note) > 400 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
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

  select * into v_slot
  from public.teacher_availability_slots
  where id = v_booking.availability_slot_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'slot_not_found');
  end if;

  v_title := left(
    'Trial · ' || v_booking.student_display_name || ' · ' ||
      to_char(v_slot.starts_at at time zone v_slot.timezone, 'Dy DD Mon HH24:MI'),
    120
  );

  insert into public.teacher_classes (teacher_id, title, course_id, class_kind)
  values (v_teacher, v_title, null, 'trial')
  returning id into v_class_id;

  if v_booking.student_id is not null then
    insert into public.class_enrollments (class_id, student_id)
    values (v_class_id, v_booking.student_id)
    on conflict do nothing;
  end if;

  insert into public.trial_occurrences (
    teacher_id,
    booking_id,
    student_id,
    guardian_user_id,
    class_id,
    starts_at,
    duration_minutes,
    timezone
  )
  values (
    v_teacher,
    v_booking.id,
    v_booking.student_id,
    v_booking.guardian_user_id,
    v_class_id,
    v_slot.starts_at,
    v_slot.duration_minutes,
    v_slot.timezone
  )
  returning id into v_occurrence_id;

  update public.trial_booking_requests
  set
    status = 'confirmed',
    teacher_note = v_note,
    occurrence_id = v_occurrence_id,
    class_id = v_class_id,
    updated_at = now()
  where id = v_booking.id;

  update public.teacher_availability_slots
  set status = 'booked', updated_at = now()
  where id = v_slot.id;

  return jsonb_build_object(
    'ok', true,
    'occurrenceId', v_occurrence_id,
    'classId', v_class_id
  );
end;
$$;

create or replace function public.cancel_trial_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_booking public.trial_booking_requests%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_booking
  from public.trial_booking_requests
  where id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_booking.guardian_user_id <> v_user then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  if v_booking.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  update public.trial_booking_requests
  set status = 'cancelled', updated_at = now()
  where id = v_booking.id;

  update public.teacher_availability_slots
  set status = 'open', updated_at = now()
  where id = v_booking.availability_slot_id
    and status = 'held';

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.request_trial_booking(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.cancel_trial_booking(uuid) to authenticated;
-- confirm / decline grants already exist from 114; re-assert
grant execute on function public.confirm_trial_booking(uuid, text) to authenticated;
grant execute on function public.decline_trial_booking(uuid, text) to authenticated;

-- Public resolve: published space handle → teacher id when trials enabled
create or replace function public.resolve_trial_teacher_by_handle(p_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_handle text := lower(trim(coalesce(p_handle, '')));
  v_row record;
begin
  if v_handle = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_handle');
  end if;

  select ts.teacher_id, ts.title, ts.handle
    into v_row
  from public.teacher_spaces ts
  where ts.handle = v_handle
    and ts.is_published = true
    and ts.trials_enabled = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'teacherId', v_row.teacher_id,
    'title', v_row.title,
    'handle', v_row.handle
  );
end;
$$;

grant execute on function public.resolve_trial_teacher_by_handle(text) to anon, authenticated;
