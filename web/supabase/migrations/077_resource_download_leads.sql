-- Email-gated teacher resource downloads (mini-series lesson plans, etc.)

create table if not exists public.resource_download_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  bundle_id text not null,
  source_page text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists resource_download_leads_email_idx
  on public.resource_download_leads (lower(email));

create index if not exists resource_download_leads_created_at_idx
  on public.resource_download_leads (created_at desc);

alter table public.resource_download_leads enable row level security;

-- No public read/write policies: service role inserts from API routes only.
