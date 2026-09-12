-- WKE-003: service-only 60-day raw diagnostic retention boundary.
create index if not exists platform_usage_events_received_at_idx
  on public.platform_usage_events (received_at);

create or replace function public.prune_platform_usage_events(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.platform_usage_events
  where received_at < p_now - interval '60 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_platform_usage_events(timestamptz) from public, anon, authenticated;
grant execute on function public.prune_platform_usage_events(timestamptz) to service_role;

comment on function public.prune_platform_usage_events(timestamptz) is
  'Deletes raw platform diagnostics older than 60 days. Service role only.';
