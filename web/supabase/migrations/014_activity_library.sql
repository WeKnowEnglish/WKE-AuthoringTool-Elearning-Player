create table if not exists public.activity_library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  activity_subtype text not null check (
    activity_subtype in (
      'mc_quiz',
      'true_false',
      'fill_blanks',
      'fix_text',
      'drag_sentence',
      'listen_hotspot_sequence'
    )
  ),
  level text not null default '',
  topic text not null default '',
  vocabulary text[] not null default '{}',
  payload jsonb not null default '{"items":[]}'::jsonb,
  question_count int not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activity_library_items_subtype_idx
  on public.activity_library_items(activity_subtype);
create index if not exists activity_library_items_level_idx
  on public.activity_library_items(level);
create index if not exists activity_library_items_topic_idx
  on public.activity_library_items(topic);
create index if not exists activity_library_items_created_at_idx
  on public.activity_library_items(created_at desc);
create index if not exists activity_library_items_vocabulary_gin_idx
  on public.activity_library_items using gin(vocabulary);

alter table public.activity_library_items enable row level security;

drop policy if exists activity_library_items_teacher_read_own on public.activity_library_items;
create policy activity_library_items_teacher_read_own
  on public.activity_library_items
  for select
  to authenticated
  using (
    auth.uid() = created_by
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false)
  );

drop policy if exists activity_library_items_teacher_insert on public.activity_library_items;
create policy activity_library_items_teacher_insert
  on public.activity_library_items
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false)
  );

drop policy if exists activity_library_items_teacher_update_own on public.activity_library_items;
create policy activity_library_items_teacher_update_own
  on public.activity_library_items
  for update
  to authenticated
  using (
    auth.uid() = created_by
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false)
  )
  with check (
    auth.uid() = created_by
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false)
  );

drop policy if exists activity_library_items_teacher_delete_own on public.activity_library_items;
create policy activity_library_items_teacher_delete_own
  on public.activity_library_items
  for delete
  to authenticated
  using (
    auth.uid() = created_by
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false)
  );
