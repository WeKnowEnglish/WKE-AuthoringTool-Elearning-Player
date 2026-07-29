-- =============================================================================
-- Lexicon ↔ media library links (many-to-many; not 1:1 word↔image)
-- =============================================================================
-- Teachers attach shared media_assets to dictionary ids (pv_* / tw_*).
-- Vocabulary lists and other authoring surfaces can write links when a row has
-- sourceWordId; media stays reusable across words and activities.
-- =============================================================================

create table if not exists public.lexicon_media_links (
  id uuid primary key default gen_random_uuid(),
  lexicon_id text not null,
  media_asset_id uuid not null references public.media_assets (id) on delete cascade,
  role text not null default 'illustration'
    check (role in ('illustration', 'pronunciation', 'scene', 'other')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint lexicon_media_links_lexicon_id_len
    check (char_length(trim(lexicon_id)) between 2 and 80)
);

create unique index if not exists lexicon_media_links_unique_uidx
  on public.lexicon_media_links (lexicon_id, media_asset_id, role);

create index if not exists lexicon_media_links_lexicon_id_idx
  on public.lexicon_media_links (lexicon_id);

create index if not exists lexicon_media_links_media_asset_id_idx
  on public.lexicon_media_links (media_asset_id);

create index if not exists lexicon_media_links_created_at_idx
  on public.lexicon_media_links (created_at desc);

comment on table public.lexicon_media_links is
  'Many-to-many links between lexicon entries (pv_*/tw_*) and teacher media_assets.';

alter table public.lexicon_media_links enable row level security;

grant select, insert, delete on public.lexicon_media_links to authenticated;

drop policy if exists lexicon_media_links_teacher_select on public.lexicon_media_links;
create policy lexicon_media_links_teacher_select
  on public.lexicon_media_links for select
  to authenticated
  using (public.is_teacher());

drop policy if exists lexicon_media_links_teacher_insert on public.lexicon_media_links;
create policy lexicon_media_links_teacher_insert
  on public.lexicon_media_links for insert
  to authenticated
  with check (
    public.is_teacher()
    and created_by = auth.uid()
  );

drop policy if exists lexicon_media_links_teacher_delete on public.lexicon_media_links;
create policy lexicon_media_links_teacher_delete
  on public.lexicon_media_links for delete
  to authenticated
  using (
    public.is_teacher()
    and created_by = auth.uid()
  );
