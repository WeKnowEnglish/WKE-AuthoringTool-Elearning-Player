-- Class homework / offline assignments (teacher stages; enrolled students can read assigned rows).

create table if not exists public.class_homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  instructions text not null default '',
  due_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'assigned', 'closed')),
  payload jsonb not null default '{}'::jsonb,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_homework_title_len check (char_length(trim(title)) between 1 and 120),
  constraint class_homework_instructions_len check (char_length(instructions) <= 2000),
  constraint class_homework_payload_is_object check (jsonb_typeof(payload) = 'object')
);

create index if not exists class_homework_class_updated_idx
  on public.class_homework (class_id, updated_at desc)
  where status <> 'closed';

create index if not exists class_homework_class_status_idx
  on public.class_homework (class_id, status, due_at);

alter table public.class_homework enable row level security;

grant select, insert, update, delete on public.class_homework to authenticated;

create policy class_homework_owner_select
  on public.class_homework for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy class_homework_owner_insert
  on public.class_homework for insert
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

create policy class_homework_owner_update
  on public.class_homework for update
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

create policy class_homework_owner_delete
  on public.class_homework for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

-- Enrolled students can read assigned/closed homework for their classes.
create policy class_homework_student_select
  on public.class_homework for select
  to authenticated
  using (
    public.is_student()
    and status in ('assigned', 'closed')
    and exists (
      select 1
      from public.class_enrollments ce
      where ce.class_id = class_homework.class_id
        and ce.student_id = auth.uid()
    )
  );
