-- Trial onboarding first pass:
-- recurring teacher availability, parent-owned pending booking edits,
-- parent-managed prospect credentials, and student discovery during a trial.

-- ---------------------------------------------------------------------------
-- Recurring availability series
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_availability_series (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  starts_on date not null,
  local_start_time time not null,
  repeat_weeks smallint not null default 1 check (repeat_weeks between 1 and 16),
  duration_minutes integer not null default 45 check (duration_minutes between 15 and 240),
  timezone text not null default 'Asia/Bangkok',
  note text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_availability_series_timezone_len
    check (char_length(trim(timezone)) between 3 and 64),
  constraint teacher_availability_series_note_len
    check (note is null or char_length(note) <= 280)
);

alter table public.teacher_availability_series enable row level security;
grant select on public.teacher_availability_series to authenticated;

drop policy if exists teacher_availability_series_owner_select
  on public.teacher_availability_series;
create policy teacher_availability_series_owner_select
  on public.teacher_availability_series for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

alter table public.teacher_availability_slots
  add column if not exists series_id uuid
    references public.teacher_availability_series (id) on delete set null,
  add column if not exists series_sequence smallint;

create index if not exists teacher_availability_slots_series_idx
  on public.teacher_availability_slots (series_id, series_sequence);

create or replace function public.create_trial_availability_series(
  p_starts_on date,
  p_local_start_time time,
  p_repeat_weeks integer,
  p_duration_minutes integer,
  p_timezone text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher uuid := auth.uid();
  v_timezone text := trim(coalesce(p_timezone, ''));
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_repeat integer := greatest(1, least(coalesce(p_repeat_weeks, 1), 16));
  v_duration integer := greatest(15, least(coalesce(p_duration_minutes, 45), 240));
  v_series_id uuid;
  v_index integer;
  v_starts_at timestamptz;
  v_created integer := 0;
begin
  if v_teacher is null or not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'teacher_only');
  end if;

  if p_starts_on is null or p_local_start_time is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_start');
  end if;

  if not exists (select 1 from pg_timezone_names where name = v_timezone) then
    return jsonb_build_object('ok', false, 'error', 'invalid_timezone');
  end if;

  if v_note is not null and char_length(v_note) > 280 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
  end if;

  insert into public.teacher_availability_series (
    teacher_id, starts_on, local_start_time, repeat_weeks,
    duration_minutes, timezone, note
  ) values (
    v_teacher, p_starts_on, p_local_start_time, v_repeat,
    v_duration, v_timezone, v_note
  ) returning id into v_series_id;

  for v_index in 0..(v_repeat - 1) loop
    v_starts_at := (
      (p_starts_on + (v_index * 7)) + p_local_start_time
    ) at time zone v_timezone;

    if v_starts_at > now() and not exists (
      select 1
      from public.teacher_availability_slots existing
      where existing.teacher_id = v_teacher
        and existing.starts_at = v_starts_at
        and existing.status <> 'cancelled'
    ) then
      insert into public.teacher_availability_slots (
        teacher_id, starts_at, duration_minutes, timezone, status, note,
        series_id, series_sequence
      ) values (
        v_teacher, v_starts_at, v_duration, v_timezone, 'open', v_note,
        v_series_id, v_index
      );
      v_created := v_created + 1;
    end if;
  end loop;

  if v_created = 0 then
    delete from public.teacher_availability_series where id = v_series_id;
    return jsonb_build_object('ok', false, 'error', 'no_future_slots');
  end if;

  return jsonb_build_object(
    'ok', true,
    'seriesId', v_series_id,
    'slotCount', v_created
  );
end;
$$;

create or replace function public.update_trial_availability_slot(
  p_slot_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_timezone text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher uuid := auth.uid();
  v_slot public.teacher_availability_slots%rowtype;
  v_timezone text := trim(coalesce(p_timezone, ''));
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_duration integer := greatest(15, least(coalesce(p_duration_minutes, 45), 240));
begin
  if v_teacher is null or not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'teacher_only');
  end if;

  select * into v_slot
  from public.teacher_availability_slots
  where id = p_slot_id
  for update;

  if not found or v_slot.teacher_id <> v_teacher then
    return jsonb_build_object('ok', false, 'error', 'slot_not_found');
  end if;

  if v_slot.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'slot_not_editable');
  end if;

  if p_starts_at is null or p_starts_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_start');
  end if;

  if not exists (select 1 from pg_timezone_names where name = v_timezone) then
    return jsonb_build_object('ok', false, 'error', 'invalid_timezone');
  end if;

  if v_note is not null and char_length(v_note) > 280 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
  end if;

  if exists (
    select 1
    from public.teacher_availability_slots existing
    where existing.teacher_id = v_teacher
      and existing.id <> v_slot.id
      and existing.starts_at = p_starts_at
      and existing.status <> 'cancelled'
  ) then
    return jsonb_build_object('ok', false, 'error', 'slot_overlap');
  end if;

  update public.teacher_availability_slots
  set starts_at = p_starts_at,
      duration_minutes = v_duration,
      timezone = v_timezone,
      note = v_note,
      updated_at = now()
  where id = v_slot.id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.create_trial_availability_series(
  date, time, integer, integer, text, text
) to authenticated;
grant execute on function public.update_trial_availability_slot(
  uuid, timestamptz, integer, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Parent-owned pending booking details and rescheduling
-- ---------------------------------------------------------------------------

alter table public.trial_booking_requests
  add column if not exists student_created_for_trial boolean not null default false;

create or replace function public.update_pending_trial_booking(
  p_booking_id uuid,
  p_availability_slot_id uuid,
  p_child_display_name text default null,
  p_child_age_band text default null,
  p_guardian_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guardian uuid := auth.uid();
  v_booking public.trial_booking_requests%rowtype;
  v_new_slot public.teacher_availability_slots%rowtype;
  v_name text := nullif(trim(coalesce(p_child_display_name, '')), '');
  v_age text := nullif(trim(coalesce(p_child_age_band, '')), '');
  v_note text := nullif(trim(coalesce(p_guardian_note, '')), '');
begin
  if v_guardian is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_booking
  from public.trial_booking_requests
  where id = p_booking_id
  for update;

  if not found or v_booking.guardian_user_id <> v_guardian then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  if v_booking.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  if v_note is not null and char_length(v_note) > 400 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
  end if;

  if v_booking.student_id is null then
    if v_name is null or char_length(v_name) < 2 then
      return jsonb_build_object('ok', false, 'error', 'child_name_required');
    end if;
    if char_length(v_name) > 120 then
      return jsonb_build_object('ok', false, 'error', 'child_name_too_long');
    end if;
  else
    v_name := v_booking.student_display_name;
    v_age := v_booking.child_age_band;
  end if;

  select * into v_new_slot
  from public.teacher_availability_slots
  where id = p_availability_slot_id
  for update;

  if not found or v_new_slot.teacher_id <> v_booking.teacher_id then
    return jsonb_build_object('ok', false, 'error', 'slot_not_found');
  end if;

  if v_new_slot.id <> v_booking.availability_slot_id and
     (v_new_slot.status <> 'open' or v_new_slot.starts_at <= now()) then
    return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
  end if;

  if v_new_slot.id <> v_booking.availability_slot_id then
    update public.teacher_availability_slots
    set status = 'open', updated_at = now()
    where id = v_booking.availability_slot_id and status = 'held';

    update public.teacher_availability_slots
    set status = 'held', updated_at = now()
    where id = v_new_slot.id;
  end if;

  update public.trial_booking_requests
  set availability_slot_id = v_new_slot.id,
      student_display_name = left(coalesce(v_name, student_display_name), 120),
      child_age_band = v_age,
      guardian_note = v_note,
      updated_at = now()
  where id = v_booking.id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.update_pending_trial_booking(
  uuid, uuid, text, text, text
) to authenticated;

-- Replace the prospect attachment RPC so the parent portal knows which
-- accounts were created specifically for a trial and can safely offer setup.
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
      return jsonb_build_object(
        'ok', true,
        'studentId', v_booking.student_id,
        'alreadyAttached', true
      );
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
  set student_id = p_student_id,
      student_created_for_trial = true,
      updated_at = now()
  where id = v_booking.id;

  insert into public.student_guardians (
    student_id, guardian_user_id, relationship_type, status,
    source_invitation_id, invited_by, activated_at,
    revoked_at, revoked_by, updated_at
  ) values (
    p_student_id, v_booking.guardian_user_id, 'parent', 'active',
    null, v_teacher, now(), null, null, now()
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
    actor_user_id, student_id, guardian_user_id, action
  ) values (
    v_teacher, p_student_id, v_booking.guardian_user_id,
    'trial_prospect_guardian_linked'
  );

  return jsonb_build_object('ok', true, 'studentId', p_student_id);
end;
$$;

grant execute on function public.attach_student_to_pending_trial_booking(uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Student discovery: answered by the enrolled student during their trial.
-- ---------------------------------------------------------------------------

create table if not exists public.trial_student_discovery (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique
    references public.trial_booking_requests (id) on delete cascade,
  class_id uuid not null unique
    references public.teacher_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  guardian_user_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  preferred_name text not null,
  interests text,
  english_goals text,
  english_use text,
  confidence smallint check (confidence between 1 and 5),
  feels_easy text,
  feels_difficult text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trial_student_discovery_preferred_name_len
    check (char_length(trim(preferred_name)) between 1 and 120),
  constraint trial_student_discovery_interests_len
    check (interests is null or char_length(interests) <= 400),
  constraint trial_student_discovery_goals_len
    check (english_goals is null or char_length(english_goals) <= 400),
  constraint trial_student_discovery_use_len
    check (english_use is null or char_length(english_use) <= 240),
  constraint trial_student_discovery_easy_len
    check (feels_easy is null or char_length(feels_easy) <= 240),
  constraint trial_student_discovery_difficult_len
    check (feels_difficult is null or char_length(feels_difficult) <= 240)
);

alter table public.trial_student_discovery enable row level security;
grant select on public.trial_student_discovery to authenticated;
revoke insert, update, delete on public.trial_student_discovery from authenticated;

drop policy if exists trial_student_discovery_student_select
  on public.trial_student_discovery;
create policy trial_student_discovery_student_select
  on public.trial_student_discovery for select to authenticated
  using (student_id = auth.uid());

drop policy if exists trial_student_discovery_teacher_select
  on public.trial_student_discovery;
create policy trial_student_discovery_teacher_select
  on public.trial_student_discovery for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists trial_student_discovery_guardian_select
  on public.trial_student_discovery;
create policy trial_student_discovery_guardian_select
  on public.trial_student_discovery for select to authenticated
  using (guardian_user_id = auth.uid());

create or replace function public.save_my_trial_discovery(
  p_class_id uuid,
  p_preferred_name text,
  p_interests text default null,
  p_english_goals text default null,
  p_english_use text default null,
  p_confidence integer default null,
  p_feels_easy text default null,
  p_feels_difficult text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_booking public.trial_booking_requests%rowtype;
  v_name text := nullif(trim(coalesce(p_preferred_name, '')), '');
begin
  if v_student is null or not public.is_student() then
    return jsonb_build_object('ok', false, 'error', 'student_only');
  end if;

  select * into v_booking
  from public.trial_booking_requests
  where class_id = p_class_id
    and student_id = v_student
    and status = 'confirmed';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'trial_not_found');
  end if;

  if v_name is null or char_length(v_name) > 120 then
    return jsonb_build_object('ok', false, 'error', 'preferred_name_required');
  end if;

  if p_confidence is not null and (p_confidence < 1 or p_confidence > 5) then
    return jsonb_build_object('ok', false, 'error', 'invalid_confidence');
  end if;

  insert into public.trial_student_discovery (
    booking_id, class_id, teacher_id, guardian_user_id, student_id,
    preferred_name, interests, english_goals, english_use, confidence,
    feels_easy, feels_difficult, submitted_at, updated_at
  ) values (
    v_booking.id, p_class_id, v_booking.teacher_id,
    v_booking.guardian_user_id, v_student,
    v_name,
    nullif(left(trim(coalesce(p_interests, '')), 400), ''),
    nullif(left(trim(coalesce(p_english_goals, '')), 400), ''),
    nullif(left(trim(coalesce(p_english_use, '')), 240), ''),
    p_confidence,
    nullif(left(trim(coalesce(p_feels_easy, '')), 240), ''),
    nullif(left(trim(coalesce(p_feels_difficult, '')), 240), ''),
    now(), now()
  )
  on conflict (booking_id) do update
    set preferred_name = excluded.preferred_name,
        interests = excluded.interests,
        english_goals = excluded.english_goals,
        english_use = excluded.english_use,
        confidence = excluded.confidence,
        feels_easy = excluded.feels_easy,
        feels_difficult = excluded.feels_difficult,
        submitted_at = excluded.submitted_at,
        updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.save_my_trial_discovery(
  uuid, text, text, text, text, integer, text, text
) to authenticated;

-- Include class kind in the student membership contract so only trial classes
-- show the student discovery activity.
-- Some pilot databases were created before migration 086 added these flags.
-- Bootstrap them here so this onboarding migration is safe on those databases.
alter table public.teacher_classes
  add column if not exists student_tab_schedule_enabled boolean not null default false,
  add column if not exists student_tab_noticeboard_enabled boolean not null default false,
  add column if not exists student_tab_materials_enabled boolean not null default false,
  add column if not exists class_kind text not null default 'regular';

alter table public.teacher_classes
  drop constraint if exists teacher_classes_class_kind_check;

alter table public.teacher_classes
  add constraint teacher_classes_class_kind_check
  check (class_kind in ('regular', 'trial'));

drop function if exists public.student_class_memberships();

create function public.student_class_memberships()
returns table (
  class_id uuid,
  title text,
  join_code text,
  enrolled_at timestamptz,
  student_tab_schedule_enabled boolean,
  student_tab_noticeboard_enabled boolean,
  student_tab_materials_enabled boolean,
  class_kind text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ce.class_id,
    tc.title,
    tc.join_code,
    ce.enrolled_at,
    tc.student_tab_schedule_enabled,
    tc.student_tab_noticeboard_enabled,
    tc.student_tab_materials_enabled,
    tc.class_kind
  from public.class_enrollments ce
  join public.teacher_classes tc on tc.id = ce.class_id
  where public.is_student()
    and ce.student_id = auth.uid()
  order by ce.enrolled_at asc;
$$;

grant execute on function public.student_class_memberships() to authenticated;
