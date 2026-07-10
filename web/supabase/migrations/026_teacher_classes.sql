-- T0: teacher classes + student roster (enrollment foundation for T-track)

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'student';
$$;

create table public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  course_id uuid references public.courses (id) on delete set null,
  join_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint teacher_classes_title_len check (char_length(trim(title)) between 1 and 120),
  constraint teacher_classes_join_code_len check (char_length(join_code) = 6),
  constraint teacher_classes_join_code_unique unique (join_code)
);

create index teacher_classes_teacher_created_idx
  on public.teacher_classes (teacher_id, created_at desc);

create table public.class_enrollments (
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create index class_enrollments_student_id_idx
  on public.class_enrollments (student_id);

create or replace function public.generate_class_join_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  chars constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  result text := '';
  i int;
  attempts int := 0;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.teacher_classes where join_code = result);
    attempts := attempts + 1;
    if attempts > 32 then
      raise exception 'could not generate unique join code';
    end if;
  end loop;
  return result;
end;
$$;

alter table public.teacher_classes
  alter column join_code set default public.generate_class_join_code();

create or replace function public.teacher_can_read_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_teacher()
    and exists (
      select 1
      from public.class_enrollments ce
      join public.teacher_classes tc on tc.id = ce.class_id
      where ce.student_id = p_student_id
        and tc.teacher_id = auth.uid()
        and tc.archived_at is null
    );
$$;

create or replace function public.join_class_by_code(p_join_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_code text := upper(trim(p_join_code));
  v_class public.teacher_classes%rowtype;
begin
  if v_student_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_student() then
    return jsonb_build_object('ok', false, 'error', 'students_only');
  end if;

  if length(v_code) <> 6 then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select * into v_class
  from public.teacher_classes
  where join_code = v_code
    and archived_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  insert into public.class_enrollments (class_id, student_id)
  values (v_class.id, v_student_id)
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'classId', v_class.id,
    'title', v_class.title
  );
end;
$$;

alter table public.teacher_classes enable row level security;
alter table public.class_enrollments enable row level security;

create policy "teacher_classes_teacher_select"
  on public.teacher_classes for select
  to authenticated
  using (teacher_id = auth.uid());

create policy "teacher_classes_teacher_insert"
  on public.teacher_classes for insert
  to authenticated
  with check (teacher_id = auth.uid());

create policy "teacher_classes_teacher_update"
  on public.teacher_classes for update
  to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "class_enrollments_teacher_select"
  on public.class_enrollments for select
  to authenticated
  using (
    exists (
      select 1
      from public.teacher_classes tc
      where tc.id = class_id
        and tc.teacher_id = auth.uid()
    )
  );

create policy "class_enrollments_teacher_delete"
  on public.class_enrollments for delete
  to authenticated
  using (
    exists (
      select 1
      from public.teacher_classes tc
      where tc.id = class_id
        and tc.teacher_id = auth.uid()
    )
  );

create policy "class_enrollments_student_select_own"
  on public.class_enrollments for select
  to authenticated
  using (student_id = auth.uid());

create policy "student_profiles_teacher_select_enrolled"
  on public.student_profiles for select
  to authenticated
  using (public.teacher_can_read_student(user_id));

grant select, insert, update on public.teacher_classes to authenticated;
grant select, delete on public.class_enrollments to authenticated;
grant execute on function public.join_class_by_code(text) to authenticated;
grant execute on function public.generate_class_join_code() to authenticated;
