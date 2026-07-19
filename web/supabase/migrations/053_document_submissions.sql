-- Document activity submission snapshots (Chunk 2).
-- Service-role writes from Next.js APIs.

create table if not exists public.document_submissions (
  id text primary key,
  round_id text not null references public.document_rounds (id) on delete cascade,
  document_id text not null,
  owner_type text not null,
  owner_id text not null,
  contributor_ids text[] not null default '{}',
  revision integer not null,
  submission_type text not null,
  content_json jsonb not null default '{}'::jsonb,
  plain_text text not null default '',
  word_count integer not null default 0,
  submitted_at timestamptz not null default now(),
  unique (round_id, document_id, revision)
);

create index if not exists document_submissions_round_idx
  on public.document_submissions (round_id, submitted_at desc);

alter table public.document_submissions enable row level security;

revoke all on public.document_submissions from public, anon, authenticated;

grant all on public.document_submissions to service_role;
