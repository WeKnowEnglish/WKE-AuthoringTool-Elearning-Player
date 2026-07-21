-- Class lesson staging: prepare activity playlists before Virtual Classroom launch.

create table if not exists public.class_lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'archived')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_lessons_title_len check (char_length(trim(title)) between 1 and 120),
  constraint class_lessons_notes_len check (char_length(notes) <= 2000)
);

create index if not exists class_lessons_class_updated_idx
  on public.class_lessons (class_id, updated_at desc)
  where status <> 'archived';

create index if not exists class_lessons_teacher_updated_idx
  on public.class_lessons (teacher_id, updated_at desc);

create table if not exists public.class_lesson_steps (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.class_lessons (id) on delete cascade,
  position integer not null check (position >= 0),
  kind text not null
    check (kind in ('whiteboard', 'document', 'word_cards', 'live_game')),
  title text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_lesson_steps_title_len check (char_length(trim(title)) between 1 and 120),
  constraint class_lesson_steps_config_is_object check (jsonb_typeof(config) = 'object'),
  constraint class_lesson_steps_lesson_position_unique unique (lesson_id, position)
);

create index if not exists class_lesson_steps_lesson_position_idx
  on public.class_lesson_steps (lesson_id, position);

alter table public.class_lessons enable row level security;
alter table public.class_lesson_steps enable row level security;

grant select, insert, update, delete on public.class_lessons to authenticated;
grant select, insert, update, delete on public.class_lesson_steps to authenticated;

create policy class_lessons_owner_select
  on public.class_lessons for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy class_lessons_owner_insert
  on public.class_lessons for insert
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

create policy class_lessons_owner_update
  on public.class_lessons for update
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

create policy class_lessons_owner_delete
  on public.class_lessons for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy class_lesson_steps_owner_select
  on public.class_lesson_steps for select
  to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.class_lessons cl
      where cl.id = lesson_id
        and cl.teacher_id = auth.uid()
    )
  );

create policy class_lesson_steps_owner_insert
  on public.class_lesson_steps for insert
  to authenticated
  with check (
    public.is_teacher()
    and exists (
      select 1
      from public.class_lessons cl
      where cl.id = lesson_id
        and cl.teacher_id = auth.uid()
    )
  );

create policy class_lesson_steps_owner_update
  on public.class_lesson_steps for update
  to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.class_lessons cl
      where cl.id = lesson_id
        and cl.teacher_id = auth.uid()
    )
  )
  with check (
    public.is_teacher()
    and exists (
      select 1
      from public.class_lessons cl
      where cl.id = lesson_id
        and cl.teacher_id = auth.uid()
    )
  );

create policy class_lesson_steps_owner_delete
  on public.class_lesson_steps for delete
  to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.class_lessons cl
      where cl.id = lesson_id
        and cl.teacher_id = auth.uid()
    )
  );
