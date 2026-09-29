-- Service-only audit trail for security-sensitive administrator actions.
-- Never store credentials, PINs, invitation links, tokens, or request bodies here.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  action text not null,
  target_type text not null,
  target_id text,
  target_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_log_action_length check (char_length(action) between 3 and 100),
  constraint admin_audit_log_target_type_length check (char_length(target_type) between 3 and 50),
  constraint admin_audit_log_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_actor_created_idx
  on public.admin_audit_log (actor_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;

revoke all on table public.admin_audit_log from public, anon, authenticated;
grant select, insert on table public.admin_audit_log to service_role;

comment on table public.admin_audit_log is
  'Service-only audit trail for administrator actions. Credentials and invitation links are prohibited.';
