-- Private photos and drawings for creative_presentation homework parts.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework_media',
  'homework_media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.homework_collection_media (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.class_homework(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  part_id text not null,
  slot_id text not null,
  storage_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size int not null check (byte_size > 0 and byte_size <= 5242880),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id, part_id, slot_id)
);

create index if not exists homework_collection_media_homework_idx
  on public.homework_collection_media(homework_id, student_id);

alter table public.homework_collection_media enable row level security;
grant select on public.homework_collection_media to authenticated;

create policy "homework_collection_media_student_select"
  on public.homework_collection_media for select
  to authenticated
  using (student_id = auth.uid());

create policy "homework_collection_media_teacher_select"
  on public.homework_collection_media for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_homework h
      join public.teacher_classes tc on tc.id = h.class_id
      where h.id = homework_id
        and (h.teacher_id = auth.uid() or tc.teacher_id = auth.uid())
    )
  );

comment on table public.homework_collection_media is
  'Private student photos and drawings for creative homework presentation slots.';
