-- Word cards submission snapshots (WC-2).
-- Service-role writes from Next.js APIs.

create table if not exists public.word_card_submissions (
  id text primary key,
  round_id text not null references public.word_card_rounds (id) on delete cascade,
  card_id text not null,
  owner_type text not null,
  owner_id text not null,
  revision integer not null,
  submission_type text not null,
  assigned_word text not null default '',
  definition text not null default '',
  example_sentence text not null default '',
  drawing_json jsonb not null default '{"strokes":[]}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (round_id, card_id, revision)
);

create index if not exists word_card_submissions_round_idx
  on public.word_card_submissions (round_id, submitted_at desc);

alter table public.word_card_submissions enable row level security;

revoke all on public.word_card_submissions from public, anon, authenticated;

grant all on public.word_card_submissions to service_role;
