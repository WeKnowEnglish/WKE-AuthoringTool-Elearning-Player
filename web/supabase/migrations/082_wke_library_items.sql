-- =============================================================================
-- WKE Library (public curated catalog) — Phase 1
-- =============================================================================
-- Separate from teacher-owned studio_activities (My Activity Bank).
-- Teachers browse published rows and fork a copy into their private bank.
-- Nothing in Activity Bank is auto-published here.
-- Writes: service role (admin seed / later admin UI). Teachers: SELECT published.
-- =============================================================================

create table if not exists public.wke_library_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  format text not null
    check (format in (
      'multiple_choice',
      'letter_mixup',
      'flashcards',
      'learning_track',
      'vocabulary_list',
      'explore_hotspots'
    )),
  title text not null,
  description text not null default '',
  cefr text,
  tags text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'retired')),
  cover_image_url text,
  pack jsonb not null,
  authoring jsonb,
  sort_order int not null default 0,
  source jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wke_library_items_slug_len
    check (char_length(trim(slug)) between 2 and 80),
  constraint wke_library_items_title_len
    check (char_length(trim(title)) between 1 and 160),
  constraint wke_library_items_description_len
    check (char_length(description) <= 800),
  constraint wke_library_items_cefr_len
    check (cefr is null or char_length(trim(cefr)) between 1 and 16),
  constraint wke_library_items_pack_is_object
    check (jsonb_typeof(pack) = 'object'),
  constraint wke_library_items_authoring_is_object_or_null
    check (authoring is null or jsonb_typeof(authoring) = 'object'),
  constraint wke_library_items_source_is_object
    check (jsonb_typeof(source) = 'object'),
  constraint wke_library_items_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists wke_library_items_slug_uidx
  on public.wke_library_items (slug);

create index if not exists wke_library_items_published_sort_idx
  on public.wke_library_items (sort_order asc, title asc)
  where status = 'published';

create index if not exists wke_library_items_format_published_idx
  on public.wke_library_items (format, sort_order asc)
  where status = 'published';

alter table public.wke_library_items enable row level security;

grant select on public.wke_library_items to authenticated;

drop policy if exists wke_library_items_teacher_select_published on public.wke_library_items;
create policy wke_library_items_teacher_select_published
  on public.wke_library_items
  for select
  to authenticated
  using (public.is_teacher() and status = 'published');

comment on table public.wke_library_items is
  'Curated WKE Library catalog. Teachers fork published items into studio_activities; not auto-filled from private bank.';

comment on column public.wke_library_items.slug is
  'Stable curated id (e.g. cover-and-explore). Used for idempotent seed upserts.';

comment on column public.wke_library_items.pack is
  'Lesson Player play pack snapshot for the format.';

comment on column public.wke_library_items.authoring is
  'Authoring document for round-trip edit after fork (required for explore_hotspots).';
