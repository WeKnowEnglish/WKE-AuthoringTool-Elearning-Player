-- Slice B: forming-class offered windows + parent schedule preferences

alter table public.teacher_classes
  add column if not exists preference_collection_open boolean not null default false;

comment on column public.teacher_classes.preference_collection_open is
  'When true, guardians of enrolled students can submit ranked schedule preferences against class_schedule_windows.';

-- Offered time windows (not yet the confirmed class_meeting_slots).
create table if not exists public.class_schedule_windows (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes integer not null default 60
    check (duration_minutes between 15 and 240),
  timezone text not null default 'Asia/Bangkok',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_schedule_windows_timezone_len check (char_length(trim(timezone)) between 3 and 64),
  constraint class_schedule_windows_class_weekday_time_unique unique (class_id, weekday, start_time)
);

create index if not exists class_schedule_windows_class_idx
  on public.class_schedule_windows (class_id, sort_order, weekday, start_time);

alter table public.class_schedule_windows enable row level security;
grant select, insert, update, delete on public.class_schedule_windows to authenticated;

drop policy if exists class_schedule_windows_owner_select on public.class_schedule_windows;
create policy class_schedule_windows_owner_select
  on public.class_schedule_windows for select to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists class_schedule_windows_owner_insert on public.class_schedule_windows;
create policy class_schedule_windows_owner_insert
  on public.class_schedule_windows for insert to authenticated
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and exists (
      select 1 from public.teacher_classes tc
      where tc.id = class_id and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists class_schedule_windows_owner_update on public.class_schedule_windows;
create policy class_schedule_windows_owner_update
  on public.class_schedule_windows for update to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and exists (
      select 1 from public.teacher_classes tc
      where tc.id = class_id and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists class_schedule_windows_owner_delete on public.class_schedule_windows;
create policy class_schedule_windows_owner_delete
  on public.class_schedule_windows for delete to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists class_schedule_windows_guardian_select on public.class_schedule_windows;
create policy class_schedule_windows_guardian_select
  on public.class_schedule_windows for select to authenticated
  using (
    exists (
      select 1
      from public.class_enrollments ce
      join public.student_guardians sg on sg.student_id = ce.student_id
      join public.teacher_classes tc on tc.id = ce.class_id
      where ce.class_id = class_schedule_windows.class_id
        and sg.guardian_user_id = auth.uid()
        and sg.status = 'active'
        and tc.preference_collection_open = true
    )
  );

-- One ranked preference submission per enrolled student.
create table if not exists public.class_schedule_preferences (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  guardian_user_id uuid not null references auth.users (id) on delete cascade,
  ranked_window_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_schedule_preferences_unique_student unique (class_id, student_id),
  constraint class_schedule_preferences_rank_len check (
    cardinality(ranked_window_ids) between 1 and 8
  )
);

create index if not exists class_schedule_preferences_class_idx
  on public.class_schedule_preferences (class_id, updated_at desc);

alter table public.class_schedule_preferences enable row level security;
grant select, insert, update, delete on public.class_schedule_preferences to authenticated;

drop policy if exists class_schedule_preferences_owner_select on public.class_schedule_preferences;
create policy class_schedule_preferences_owner_select
  on public.class_schedule_preferences for select to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1 from public.teacher_classes tc
      where tc.id = class_id and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists class_schedule_preferences_guardian_select on public.class_schedule_preferences;
create policy class_schedule_preferences_guardian_select
  on public.class_schedule_preferences for select to authenticated
  using (
    guardian_user_id = auth.uid()
    or public.is_active_guardian(student_id)
  );

drop policy if exists class_schedule_preferences_guardian_insert on public.class_schedule_preferences;
create policy class_schedule_preferences_guardian_insert
  on public.class_schedule_preferences for insert to authenticated
  with check (
    guardian_user_id = auth.uid()
    and public.is_active_guardian(student_id)
    and exists (
      select 1
      from public.class_enrollments ce
      join public.teacher_classes tc on tc.id = ce.class_id
      where ce.class_id = class_schedule_preferences.class_id
        and ce.student_id = class_schedule_preferences.student_id
        and tc.preference_collection_open = true
        and tc.archived_at is null
    )
  );

drop policy if exists class_schedule_preferences_guardian_update on public.class_schedule_preferences;
create policy class_schedule_preferences_guardian_update
  on public.class_schedule_preferences for update to authenticated
  using (
    guardian_user_id = auth.uid()
    and public.is_active_guardian(student_id)
  )
  with check (
    guardian_user_id = auth.uid()
    and public.is_active_guardian(student_id)
    and exists (
      select 1
      from public.class_enrollments ce
      join public.teacher_classes tc on tc.id = ce.class_id
      where ce.class_id = class_schedule_preferences.class_id
        and ce.student_id = class_schedule_preferences.student_id
        and tc.preference_collection_open = true
        and tc.archived_at is null
    )
  );

-- Extend linked-students payload so parents know when preference collection is open.
-- Return type changed → must drop before recreate (CREATE OR REPLACE cannot alter OUT columns).
drop function if exists public.parent_linked_students();

create or replace function public.parent_linked_students()
returns table (
  student_id uuid,
  display_name text,
  learning_band text,
  class_id uuid,
  class_title text,
  enrolled_at timestamptz,
  preference_collection_open boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.user_id,
    sp.display_name,
    sp.learning_band,
    current_class.class_id,
    current_class.class_title,
    current_class.enrolled_at,
    coalesce(current_class.preference_collection_open, false)
  from public.student_guardians sg
  join public.student_profiles sp on sp.user_id = sg.student_id
  left join lateral (
    select
      tc.id as class_id,
      tc.title as class_title,
      ce.enrolled_at,
      tc.preference_collection_open
    from public.class_enrollments ce
    join public.teacher_classes tc on tc.id = ce.class_id
    where ce.student_id = sg.student_id
      and tc.archived_at is null
    order by ce.enrolled_at desc, tc.created_at desc
    limit 1
  ) current_class on true
  where sg.guardian_user_id = auth.uid()
    and sg.status = 'active'
  order by sp.display_name, sp.user_id;
$$;

revoke execute on function public.parent_linked_students() from public, anon;
grant execute on function public.parent_linked_students() to authenticated;
