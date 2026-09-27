-- One row each time someone requests a lesson-plan file, including failed attempts.

create table if not exists public.resource_download_events (
  id uuid primary key default gen_random_uuid(),
  email text,
  resource_id text not null,
  filename text,
  byte_size bigint,
  status text not null,
  user_agent text,
  visitor_id text,
  landing_path text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  attribution_captured_at timestamptz,
  created_at timestamptz not null default now(),
  constraint resource_download_events_email_len check (
    email is null or char_length(email) between 3 and 320
  ),
  constraint resource_download_events_resource_id_len check (char_length(resource_id) between 1 and 120),
  constraint resource_download_events_filename_len check (
    filename is null or char_length(filename) between 1 and 180
  ),
  constraint resource_download_events_byte_size_nonneg check (byte_size is null or byte_size >= 0),
  constraint resource_download_events_status_check check (
    status in ('success', 'unauthorized', 'not_found', 'error')
  ),
  constraint resource_download_events_user_agent_len check (
    user_agent is null or char_length(user_agent) <= 512
  )
);

create index if not exists resource_download_events_created_at_idx
  on public.resource_download_events (created_at desc);

create index if not exists resource_download_events_email_idx
  on public.resource_download_events (lower(email), created_at desc);

alter table public.resource_download_events enable row level security;
revoke all on table public.resource_download_events from anon, authenticated;

comment on table public.resource_download_events is
  'Lesson-plan file requests. status success means the file was built and sent. Email unlocks stay in resource_download_leads.';
