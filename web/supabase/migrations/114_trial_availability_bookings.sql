-- Slice C: teacher trial availability + parent booking requests + confirmed occurrences

create table if not exists public.teacher_availability_slots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes integer not null default 45
    check (duration_minutes between 15 and 240),
  timezone text not null default 'Asia/Bangkok',
  status text not null default 'open'
    check (status in ('open', 'held', 'booked', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_availability_slots_timezone_len check (char_length(trim(timezone)) between 3 and 64),
  constraint teacher_availability_slots_note_len check (note is null or char_length(note) <= 280)
);

create index if not exists teacher_availability_slots_teacher_starts_idx
  on public.teacher_availability_slots (teacher_id, starts_at);

create index if not exists teacher_availability_slots_open_idx
  on public.teacher_availability_slots (status, starts_at)
  where status = 'open';

alter table public.teacher_availability_slots enable row level security;
grant select, insert, update, delete on public.teacher_availability_slots to authenticated;

drop policy if exists teacher_availability_slots_owner_all on public.teacher_availability_slots;
create policy teacher_availability_slots_owner_select
  on public.teacher_availability_slots for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_availability_slots_owner_insert
  on public.teacher_availability_slots for insert to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_availability_slots_owner_update
  on public.teacher_availability_slots for update to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy teacher_availability_slots_owner_delete
  on public.teacher_availability_slots for delete to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

-- Authenticated guardians can browse open future slots (booking link / book page).
drop policy if exists teacher_availability_slots_guardian_open_select on public.teacher_availability_slots;
create policy teacher_availability_slots_guardian_open_select
  on public.teacher_availability_slots for select to authenticated
  using (
    status = 'open'
    and starts_at > now()
    and exists (
      select 1 from public.student_guardians sg
      where sg.guardian_user_id = auth.uid()
        and sg.status = 'active'
    )
  );

create table if not exists public.trial_booking_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  availability_slot_id uuid not null references public.teacher_availability_slots (id) on delete restrict,
  guardian_user_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  student_display_name text not null default 'Student',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  guardian_note text,
  teacher_note text,
  occurrence_id uuid,
  class_id uuid references public.teacher_classes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trial_booking_requests_guardian_note_len check (
    guardian_note is null or char_length(guardian_note) <= 400
  ),
  constraint trial_booking_requests_teacher_note_len check (
    teacher_note is null or char_length(teacher_note) <= 400
  )
);

create unique index if not exists trial_booking_requests_one_pending_per_slot
  on public.trial_booking_requests (availability_slot_id)
  where status = 'pending';

create index if not exists trial_booking_requests_teacher_status_idx
  on public.trial_booking_requests (teacher_id, status, created_at desc);

create index if not exists trial_booking_requests_guardian_idx
  on public.trial_booking_requests (guardian_user_id, created_at desc);

create index if not exists trial_booking_requests_student_idx
  on public.trial_booking_requests (student_id, created_at desc);

alter table public.trial_booking_requests enable row level security;
grant select, insert, update on public.trial_booking_requests to authenticated;

drop policy if exists trial_booking_requests_teacher_select on public.trial_booking_requests;
create policy trial_booking_requests_teacher_select
  on public.trial_booking_requests for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists trial_booking_requests_teacher_update on public.trial_booking_requests;
create policy trial_booking_requests_teacher_update
  on public.trial_booking_requests for update to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists trial_booking_requests_guardian_select on public.trial_booking_requests;
create policy trial_booking_requests_guardian_select
  on public.trial_booking_requests for select to authenticated
  using (
    guardian_user_id = auth.uid()
    or public.is_active_guardian(student_id)
  );

drop policy if exists trial_booking_requests_guardian_insert on public.trial_booking_requests;
create policy trial_booking_requests_guardian_insert
  on public.trial_booking_requests for insert to authenticated
  with check (
    guardian_user_id = auth.uid()
    and public.is_active_guardian(student_id)
  );

drop policy if exists trial_booking_requests_guardian_update on public.trial_booking_requests;
create policy trial_booking_requests_guardian_update
  on public.trial_booking_requests for update to authenticated
  using (guardian_user_id = auth.uid())
  with check (guardian_user_id = auth.uid());

create table if not exists public.trial_occurrences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  booking_id uuid not null unique references public.trial_booking_requests (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  guardian_user_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid references public.teacher_classes (id) on delete set null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 45
    check (duration_minutes between 15 and 240),
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  constraint trial_occurrences_timezone_len check (char_length(trim(timezone)) between 3 and 64)
);

create index if not exists trial_occurrences_teacher_starts_idx
  on public.trial_occurrences (teacher_id, starts_at);

create index if not exists trial_occurrences_student_starts_idx
  on public.trial_occurrences (student_id, starts_at);

alter table public.trial_occurrences enable row level security;
grant select, insert on public.trial_occurrences to authenticated;

drop policy if exists trial_occurrences_teacher_select on public.trial_occurrences;
create policy trial_occurrences_teacher_select
  on public.trial_occurrences for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists trial_occurrences_teacher_insert on public.trial_occurrences;
create policy trial_occurrences_teacher_insert
  on public.trial_occurrences for insert to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists trial_occurrences_guardian_select on public.trial_occurrences;
create policy trial_occurrences_guardian_select
  on public.trial_occurrences for select to authenticated
  using (
    guardian_user_id = auth.uid()
    or public.is_active_guardian(student_id)
  );

-- Wire booking.occurrence_id FK after both tables exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trial_booking_requests_occurrence_fk'
  ) then
    alter table public.trial_booking_requests
      add constraint trial_booking_requests_occurrence_fk
      foreign key (occurrence_id) references public.trial_occurrences (id) on delete set null;
  end if;
end $$;

-- Guardian books an open future slot for a linked child.
create or replace function public.request_trial_booking(
  p_availability_slot_id uuid,
  p_student_id uuid,
  p_guardian_note text default null
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
  v_booking_id uuid;
begin
  if v_guardian is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_active_guardian(p_student_id) then
    return jsonb_build_object('ok', false, 'error', 'not_guardian');
  end if;

  if v_note is not null and char_length(v_note) > 400 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
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

  select coalesce(nullif(trim(sp.display_name), ''), sp.username, 'Student')
    into v_name
  from public.student_profiles sp
  where sp.user_id = p_student_id;

  v_name := coalesce(v_name, 'Student');

  insert into public.trial_booking_requests (
    teacher_id,
    availability_slot_id,
    guardian_user_id,
    student_id,
    student_display_name,
    status,
    guardian_note
  )
  values (
    v_slot.teacher_id,
    v_slot.id,
    v_guardian,
    p_student_id,
    left(v_name, 120),
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

-- Teacher confirms → occurrence + trial class enrollment.
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

  insert into public.class_enrollments (class_id, student_id)
  values (v_class_id, v_booking.student_id)
  on conflict do nothing;

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

create or replace function public.decline_trial_booking(
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
  v_note text := nullif(trim(coalesce(p_teacher_note, '')), '');
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

  update public.trial_booking_requests
  set status = 'declined', teacher_note = v_note, updated_at = now()
  where id = v_booking.id;

  update public.teacher_availability_slots
  set status = 'open', updated_at = now()
  where id = v_booking.availability_slot_id
    and status = 'held';

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.request_trial_booking(uuid, uuid, text) to authenticated;
grant execute on function public.confirm_trial_booking(uuid, text) to authenticated;
grant execute on function public.decline_trial_booking(uuid, text) to authenticated;
