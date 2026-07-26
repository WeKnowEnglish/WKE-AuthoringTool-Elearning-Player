-- =============================================================================
-- Teacher Public Space (Phase 0–1)
-- =============================================================================
-- One public "Teacher Space" per teacher (shareable gallery of frozen Studio
-- packs). Separate from private teacher_classes (roster + homework).
--
--   • teacher_spaces — profile (handle, title, bio, is_published)
--   • teacher_space_items — frozen pack snapshots curated onto the Space
--
-- Public read: anon + authenticated SELECT when the Space is published.
-- Teacher write: owner-only CRUD.
-- =============================================================================

create table if not exists public.teacher_spaces (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  handle text not null,
  title text not null,
  bio text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_spaces_teacher_unique unique (teacher_id),
  constraint teacher_spaces_handle_unique unique (handle),
  constraint teacher_spaces_handle_format check (
    handle ~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$'
  ),
  constraint teacher_spaces_title_len
    check (char_length(trim(title)) between 1 and 120),
  constraint teacher_spaces_bio_len
    check (char_length(bio) <= 500)
);

create index if not exists teacher_spaces_published_handle_idx
  on public.teacher_spaces (handle)
  where is_published = true;

create table if not exists public.teacher_space_items (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.teacher_spaces (id) on delete cascade,
  studio_activity_id uuid references public.studio_activities (id) on delete set null,
  format text not null
    check (format in (
      'multiple_choice',
      'letter_mixup',
      'flashcards',
      'learning_track'
    )),
  title text not null,
  caption text not null default '',
  pack jsonb not null,
  sort_order integer not null default 0,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_space_items_title_len
    check (char_length(trim(title)) between 1 and 160),
  constraint teacher_space_items_caption_len
    check (char_length(caption) <= 280),
  constraint teacher_space_items_pack_is_object
    check (jsonb_typeof(pack) = 'object')
);

create unique index if not exists teacher_space_items_space_activity_uidx
  on public.teacher_space_items (space_id, studio_activity_id)
  where studio_activity_id is not null;

create index if not exists teacher_space_items_space_sort_idx
  on public.teacher_space_items (space_id, sort_order asc, published_at desc);

alter table public.teacher_spaces enable row level security;
alter table public.teacher_space_items enable row level security;

grant select on public.teacher_spaces to anon, authenticated;
grant select, insert, update, delete on public.teacher_spaces to authenticated;

grant select on public.teacher_space_items to anon, authenticated;
grant select, insert, update, delete on public.teacher_space_items to authenticated;

-- Public: published spaces
drop policy if exists teacher_spaces_public_select on public.teacher_spaces;
create policy teacher_spaces_public_select
  on public.teacher_spaces for select
  to anon, authenticated
  using (is_published = true);

-- Owner: full access (including unpublished)
drop policy if exists teacher_spaces_owner_select on public.teacher_spaces;
create policy teacher_spaces_owner_select
  on public.teacher_spaces for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists teacher_spaces_owner_insert on public.teacher_spaces;
create policy teacher_spaces_owner_insert
  on public.teacher_spaces for insert
  to authenticated
  with check (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists teacher_spaces_owner_update on public.teacher_spaces;
create policy teacher_spaces_owner_update
  on public.teacher_spaces for update
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
  with check (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists teacher_spaces_owner_delete on public.teacher_spaces;
create policy teacher_spaces_owner_delete
  on public.teacher_spaces for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

-- Public: items on published spaces
drop policy if exists teacher_space_items_public_select on public.teacher_space_items;
create policy teacher_space_items_public_select
  on public.teacher_space_items for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.teacher_spaces s
      where s.id = space_id
        and s.is_published = true
    )
  );

-- Owner: items on own space
drop policy if exists teacher_space_items_owner_select on public.teacher_space_items;
create policy teacher_space_items_owner_select
  on public.teacher_space_items for select
  to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.teacher_spaces s
      where s.id = space_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists teacher_space_items_owner_insert on public.teacher_space_items;
create policy teacher_space_items_owner_insert
  on public.teacher_space_items for insert
  to authenticated
  with check (
    public.is_teacher()
    and exists (
      select 1
      from public.teacher_spaces s
      where s.id = space_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists teacher_space_items_owner_update on public.teacher_space_items;
create policy teacher_space_items_owner_update
  on public.teacher_space_items for update
  to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.teacher_spaces s
      where s.id = space_id
        and s.teacher_id = auth.uid()
    )
  )
  with check (
    public.is_teacher()
    and exists (
      select 1
      from public.teacher_spaces s
      where s.id = space_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists teacher_space_items_owner_delete on public.teacher_space_items;
create policy teacher_space_items_owner_delete
  on public.teacher_space_items for delete
  to authenticated
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.teacher_spaces s
      where s.id = space_id
        and s.teacher_id = auth.uid()
    )
  );

comment on table public.teacher_spaces is
  'One public Teacher Space per teacher — shareable gallery of learning activities (not a private class).';

comment on table public.teacher_space_items is
  'Frozen Studio packs published onto a Teacher Space for guest/untracked play.';
