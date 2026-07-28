-- Lightweight weekly class meeting schedule (not a full calendar product).

create table if not exists public.class_meeting_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes integer not null default 60
    check (duration_minutes between 15 and 240),
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_meeting_slots_timezone_len check (char_length(trim(timezone)) between 3 and 64),
  constraint class_meeting_slots_class_weekday_time_unique unique (class_id, weekday, start_time)
);

create index if not exists class_meeting_slots_class_weekday_idx
  on public.class_meeting_slots (class_id, weekday, start_time);

alter table public.class_meeting_slots enable row level security;

grant select, insert, update, delete on public.class_meeting_slots to authenticated;

create policy class_meeting_slots_owner_select
  on public.class_meeting_slots for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy class_meeting_slots_owner_insert
  on public.class_meeting_slots for insert
  to authenticated
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and exists (
      select 1
      from public.teacher_classes tc
      where tc.id = class_id
        and tc.teacher_id = auth.uid()
    )
  );

create policy class_meeting_slots_owner_update
  on public.class_meeting_slots for update
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and exists (
      select 1
      from public.teacher_classes tc
      where tc.id = class_id
        and tc.teacher_id = auth.uid()
    )
  );

create policy class_meeting_slots_owner_delete
  on public.class_meeting_slots for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

-- Enrolled students can read meeting slots for their classes.
create policy class_meeting_slots_student_select
  on public.class_meeting_slots for select
  to authenticated
  using (
    public.is_student()
    and exists (
      select 1
      from public.class_enrollments ce
      where ce.class_id = class_meeting_slots.class_id
        and ce.student_id = auth.uid()
    )
  );
