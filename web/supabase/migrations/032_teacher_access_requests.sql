-- Administrator-reviewed teacher access requests. Only the service role may read/write this table.

create table if not exists public.teacher_access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  school text not null check (char_length(school) between 2 and 180),
  reason text not null check (char_length(reason) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed')),
  notified_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.teacher_access_requests enable row level security;

revoke all on table public.teacher_access_requests from anon, authenticated;

create index if not exists teacher_access_requests_status_created_idx
  on public.teacher_access_requests (status, created_at desc);

create index if not exists teacher_access_requests_email_idx
  on public.teacher_access_requests (lower(email));
