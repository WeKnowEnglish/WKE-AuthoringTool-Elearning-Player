-- Live Game question sets and three-bank questions (Phase Q1).

create table if not exists public.live_game_question_sets (
  id uuid primary key,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  level text not null check (level in ('A1', 'A2')),
  topic text not null default '',
  learning_objective text not null default '',
  description text not null default '',
  version int not null default 1 check (version >= 1),
  status text not null default 'published'
    check (status in ('draft', 'published')),
  visibility text not null default 'system'
    check (visibility in ('system', 'teacher')),
  sort_order int not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_game_question_sets_status_sort_idx
  on public.live_game_question_sets (status, sort_order, title);

create index if not exists live_game_question_sets_created_by_idx
  on public.live_game_question_sets (created_by)
  where visibility = 'teacher';

create table if not exists public.live_game_questions (
  id uuid primary key,
  set_id uuid not null references public.live_game_question_sets (id) on delete cascade,
  bank text not null check (bank in ('harvest', 'deposit', 'craft')),
  sort_order int not null default 0,
  prompt text not null check (char_length(prompt) between 1 and 2000),
  payload jsonb not null,
  enabled boolean not null default true,
  legacy_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_game_questions_payload_type_check check (
    payload ? 'type'
    and payload->>'type' in ('multiple_choice', 'deposit_spell', 'drag_sentence')
  )
);

create index if not exists live_game_questions_set_bank_order_idx
  on public.live_game_questions (set_id, bank, sort_order);

create index if not exists live_game_questions_set_bank_enabled_idx
  on public.live_game_questions (set_id, bank)
  where enabled;

create unique index if not exists live_game_questions_set_bank_legacy_uidx
  on public.live_game_questions (set_id, bank, legacy_source_id)
  where legacy_source_id is not null;

alter table public.live_game_question_sets enable row level security;
alter table public.live_game_questions enable row level security;

grant select on public.live_game_question_sets to authenticated;
grant select on public.live_game_questions to authenticated;

drop policy if exists live_game_question_sets_published_select on public.live_game_question_sets;
create policy live_game_question_sets_published_select
  on public.live_game_question_sets for select
  to authenticated
  using (status = 'published');

drop policy if exists live_game_questions_published_select on public.live_game_questions;
create policy live_game_questions_published_select
  on public.live_game_questions for select
  to authenticated
  using (
    exists (
      select 1
      from public.live_game_question_sets s
      where s.id = set_id and s.status = 'published'
    )
  );
