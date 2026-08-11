-- Atomic compare-and-swap for Virtual Classroom runtime snapshots.
-- Service-role callers use this after Liveblocks accepts a teacher command.

create or replace function public.advance_class_session_runtime_snapshot(
  p_session_id text,
  p_expected_state_version bigint,
  p_snapshot jsonb,
  p_updated_by text
)
returns setof public.class_session_runtime_snapshots
language sql
security definer
set search_path = public
as $$
  update public.class_session_runtime_snapshots
     set state_version = state_version + 1,
         snapshot_json = jsonb_set(
           jsonb_set(
             jsonb_set(p_snapshot, '{stateVersion}', to_jsonb(state_version + 1), true),
             '{updatedAt}', to_jsonb(now()::text), true
           ),
           '{updatedBy}', to_jsonb(p_updated_by), true
         ),
         updated_at = now(),
         updated_by = p_updated_by
   where session_id = p_session_id
     and state_version = p_expected_state_version
  returning *;
$$;

revoke all on function public.advance_class_session_runtime_snapshot(text, bigint, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.advance_class_session_runtime_snapshot(text, bigint, jsonb, text)
  to service_role;
