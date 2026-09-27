-- First-touch arrival source. Host only: no IP, no full referring URL, no search query.

create table if not exists public.traffic_arrivals (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  landing_path text not null,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint traffic_arrivals_visitor_id_len check (char_length(visitor_id) between 16 and 64),
  constraint traffic_arrivals_visitor_id_unique unique (visitor_id),
  constraint traffic_arrivals_landing_path_len check (char_length(landing_path) between 1 and 180),
  constraint traffic_arrivals_referrer_host_len check (
    referrer_host is null or char_length(referrer_host) between 1 and 253
  ),
  constraint traffic_arrivals_utm_source_len check (utm_source is null or char_length(utm_source) <= 80),
  constraint traffic_arrivals_utm_medium_len check (utm_medium is null or char_length(utm_medium) <= 80),
  constraint traffic_arrivals_utm_campaign_len check (utm_campaign is null or char_length(utm_campaign) <= 80),
  constraint traffic_arrivals_utm_content_len check (utm_content is null or char_length(utm_content) <= 80),
  constraint traffic_arrivals_utm_term_len check (utm_term is null or char_length(utm_term) <= 80)
);

create index if not exists traffic_arrivals_created_at_idx
  on public.traffic_arrivals (created_at desc);

create index if not exists traffic_arrivals_referrer_created_idx
  on public.traffic_arrivals (referrer_host, created_at desc);

alter table public.traffic_arrivals enable row level security;
revoke all on table public.traffic_arrivals from anon, authenticated;

comment on table public.traffic_arrivals is
  'One row per new visitor for 90 days. referrer_host is the previous site, or null when the visit was direct.';

alter table public.teacher_access_requests
  add column if not exists visitor_id text,
  add column if not exists landing_path text,
  add column if not exists referrer_host text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists attribution_captured_at timestamptz;

alter table public.resource_download_leads
  add column if not exists visitor_id text,
  add column if not exists landing_path text,
  add column if not exists referrer_host text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists attribution_captured_at timestamptz;
