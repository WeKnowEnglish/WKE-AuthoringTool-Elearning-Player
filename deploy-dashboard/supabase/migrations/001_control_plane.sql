create extension if not exists pgcrypto;

create table if not exists public.deploy_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  plan_tier text not null default 'starter' check (plan_tier in ('starter', 'team', 'agency')),
  max_projects integer not null default 3 check (max_projects between 1 and 1000),
  max_concurrent_jobs integer not null default 2 check (max_concurrent_jobs between 1 and 100),
  preview_retention_days integer not null default 14 check (preview_retention_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create table if not exists public.deploy_users (
  id uuid primary key default gen_random_uuid(),
  github_user_id bigint not null unique,
  github_login text not null,
  display_name text,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  global_role text not null default 'viewer' check (global_role in ('owner', 'administrator', 'developer', 'viewer')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists deploy_users_github_login_lower_idx
  on public.deploy_users (lower(github_login));

create table if not exists public.deploy_memberships (
  organization_id uuid not null references public.deploy_organizations(id) on delete cascade,
  user_id uuid not null references public.deploy_users(id) on delete cascade,
  role text not null check (role in ('owner', 'administrator', 'developer', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.deploy_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.deploy_organizations(id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 160),
  github_owner text not null,
  github_repository text not null,
  preview_domain text,
  production_domain text,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (github_owner, github_repository)
);

create table if not exists public.deploy_sessions (
  token_hash text primary key check (char_length(token_hash) = 64),
  user_id uuid not null references public.deploy_users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists deploy_sessions_user_id_idx on public.deploy_sessions (user_id);
create index if not exists deploy_sessions_expires_at_idx on public.deploy_sessions (expires_at);

create table if not exists public.deploy_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.deploy_organizations(id) on delete restrict,
  project_id uuid not null references public.deploy_projects(id) on delete restrict,
  requested_by uuid references public.deploy_users(id) on delete set null,
  environment text not null check (environment in ('preview', 'production')),
  preview_slot_key text check (
    preview_slot_key is null or preview_slot_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  action text not null check (action in ('build', 'promote', 'rollback', 'destroy')),
  status text not null default 'queued' check (status in ('queued', 'authorized', 'running', 'succeeded', 'failed', 'cancelled')),
  source_branch text,
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  artifact_digest text,
  provider_job_id text,
  idempotency_key text not null unique,
  approvals_required smallint not null default 0 check (approvals_required between 0 and 5),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deploy_jobs_project_created_idx
  on public.deploy_jobs (project_id, created_at desc);
create unique index if not exists deploy_jobs_one_active_environment_idx
  on public.deploy_jobs (project_id, environment, coalesce(preview_slot_key, 'production'))
  where status in ('queued', 'authorized', 'running');

create table if not exists public.deploy_preview_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.deploy_organizations(id) on delete restrict,
  project_id uuid not null references public.deploy_projects(id) on delete cascade,
  slot_key text not null check (slot_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  source_branch text not null,
  domain text,
  provider_resource_id text,
  state text not null default 'provisioning' check (state in ('provisioning', 'ready', 'failed', 'expired', 'destroyed')),
  current_job_id uuid references public.deploy_jobs(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slot_key),
  unique (domain)
);

create or replace function public.enforce_deploy_project_quota()
returns trigger
language plpgsql
as $$
declare
  allowed_projects integer;
  active_projects integer;
begin
  if exists (
    select 1 from public.deploy_projects
    where organization_id = new.organization_id and slug = new.slug
  ) then
    return new;
  end if;
  select max_projects into allowed_projects
  from public.deploy_organizations
  where id = new.organization_id and status = 'active'
  for update;
  if allowed_projects is null then
    raise exception 'deployment organization is unavailable';
  end if;
  select count(*) into active_projects
  from public.deploy_projects
  where organization_id = new.organization_id and status <> 'archived';
  if active_projects >= allowed_projects then
    raise exception 'deployment organization project quota exceeded';
  end if;
  return new;
end;
$$;

drop trigger if exists deploy_projects_quota on public.deploy_projects;
create trigger deploy_projects_quota
before insert on public.deploy_projects
for each row execute function public.enforce_deploy_project_quota();

create or replace function public.enforce_deploy_job_quota()
returns trigger
language plpgsql
as $$
declare
  allowed_jobs integer;
  active_jobs integer;
begin
  if exists (
    select 1 from public.deploy_jobs
    where idempotency_key = new.idempotency_key
  ) then
    return new;
  end if;
  select max_concurrent_jobs into allowed_jobs
  from public.deploy_organizations
  where id = new.organization_id and status = 'active'
  for update;
  if allowed_jobs is null then
    raise exception 'deployment organization is unavailable';
  end if;
  select count(*) into active_jobs
  from public.deploy_jobs
  where organization_id = new.organization_id
    and status in ('queued', 'authorized', 'running');
  if active_jobs >= allowed_jobs then
    raise exception 'deployment organization concurrent job quota exceeded';
  end if;
  return new;
end;
$$;

drop trigger if exists deploy_jobs_quota on public.deploy_jobs;
create trigger deploy_jobs_quota
before insert on public.deploy_jobs
for each row execute function public.enforce_deploy_job_quota();

create table if not exists public.deploy_approvals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.deploy_jobs(id) on delete cascade,
  user_id uuid not null references public.deploy_users(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now(),
  unique (job_id, user_id)
);

create table if not exists public.deploy_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.deploy_organizations(id) on delete restrict,
  project_id uuid references public.deploy_projects(id) on delete cascade,
  kind text not null,
  label text not null,
  ciphertext text not null,
  key_version integer not null check (key_version > 0),
  expires_at timestamptz,
  last_rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, project_id, kind, label)
);

create table if not exists public.deploy_audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.deploy_organizations(id) on delete restrict,
  project_id uuid references public.deploy_projects(id) on delete restrict,
  actor_user_id uuid references public.deploy_users(id) on delete set null,
  actor_login text not null,
  event text not null,
  outcome text not null check (outcome in ('authorized', 'succeeded', 'failed', 'denied', 'observed')),
  source_ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists deploy_audit_project_created_idx
  on public.deploy_audit_events (project_id, created_at desc);
create index if not exists deploy_audit_actor_created_idx
  on public.deploy_audit_events (actor_user_id, created_at desc);

create or replace function public.reject_deploy_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'deploy_audit_events is append-only';
end;
$$;

drop trigger if exists deploy_audit_events_append_only on public.deploy_audit_events;
create trigger deploy_audit_events_append_only
before update or delete on public.deploy_audit_events
for each row execute function public.reject_deploy_audit_mutation();

alter table public.deploy_organizations enable row level security;
alter table public.deploy_users enable row level security;
alter table public.deploy_memberships enable row level security;
alter table public.deploy_projects enable row level security;
alter table public.deploy_sessions enable row level security;
alter table public.deploy_jobs enable row level security;
alter table public.deploy_preview_slots enable row level security;
alter table public.deploy_approvals enable row level security;
alter table public.deploy_credentials enable row level security;
alter table public.deploy_audit_events enable row level security;

revoke all on table public.deploy_organizations from anon, authenticated;
revoke all on table public.deploy_users from anon, authenticated;
revoke all on table public.deploy_memberships from anon, authenticated;
revoke all on table public.deploy_projects from anon, authenticated;
revoke all on table public.deploy_sessions from anon, authenticated;
revoke all on table public.deploy_jobs from anon, authenticated;
revoke all on table public.deploy_preview_slots from anon, authenticated;
revoke all on table public.deploy_approvals from anon, authenticated;
revoke all on table public.deploy_credentials from anon, authenticated;
revoke all on table public.deploy_audit_events from anon, authenticated;

comment on table public.deploy_credentials is
  'Ciphertext only. Encryption keys must remain outside this database.';
comment on table public.deploy_audit_events is
  'Append-only security and deployment audit trail.';
