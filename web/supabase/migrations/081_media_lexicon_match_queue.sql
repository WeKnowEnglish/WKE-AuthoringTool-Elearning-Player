-- Media → dictionary match review queue (auto-link on upload; review when ambiguous/none).

create table if not exists public.media_lexicon_match_queue (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets (id) on delete cascade,
  queried_surface text not null,
  status text not null default 'pending'
    check (status in ('pending', 'linked', 'dismissed', 'word_requested')),
  confidence text not null default 'none'
    check (confidence in ('high', 'medium', 'low', 'none')),
  match_kind text not null default 'none'
    check (match_kind in ('exact', 'singular', 'ambiguous', 'none', 'skipped')),
  candidate_lexicon_ids text[] not null default '{}',
  chosen_lexicon_id text,
  teacher_lexicon_entry_id text,
  created_by uuid not null references auth.users (id) on delete cascade,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_lexicon_match_queue_surface_len
    check (char_length(trim(queried_surface)) between 1 and 120),
  constraint media_lexicon_match_queue_note_len
    check (note is null or char_length(note) <= 500)
);

-- One open review row per asset
create unique index if not exists media_lexicon_match_queue_pending_media_uidx
  on public.media_lexicon_match_queue (media_asset_id)
  where status = 'pending';

create index if not exists media_lexicon_match_queue_status_created_idx
  on public.media_lexicon_match_queue (status, created_at desc);

create index if not exists media_lexicon_match_queue_created_by_idx
  on public.media_lexicon_match_queue (created_by, created_at desc);

comment on table public.media_lexicon_match_queue is
  'Review queue for media uploads that did not auto-link to a dictionary lemma.';

alter table public.media_lexicon_match_queue enable row level security;

grant select, insert, update, delete on public.media_lexicon_match_queue to authenticated;

drop policy if exists media_lexicon_match_queue_teacher_select on public.media_lexicon_match_queue;
create policy media_lexicon_match_queue_teacher_select
  on public.media_lexicon_match_queue for select
  to authenticated
  using (public.is_teacher());

drop policy if exists media_lexicon_match_queue_teacher_insert on public.media_lexicon_match_queue;
create policy media_lexicon_match_queue_teacher_insert
  on public.media_lexicon_match_queue for insert
  to authenticated
  with check (
    public.is_teacher()
    and created_by = auth.uid()
  );

drop policy if exists media_lexicon_match_queue_teacher_update on public.media_lexicon_match_queue;
create policy media_lexicon_match_queue_teacher_update
  on public.media_lexicon_match_queue for update
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

drop policy if exists media_lexicon_match_queue_teacher_delete on public.media_lexicon_match_queue;
create policy media_lexicon_match_queue_teacher_delete
  on public.media_lexicon_match_queue for delete
  to authenticated
  using (
    public.is_teacher()
    and created_by = auth.uid()
  );
