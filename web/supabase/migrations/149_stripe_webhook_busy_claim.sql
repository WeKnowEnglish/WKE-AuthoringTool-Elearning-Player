-- Distinguish an in-flight delivery from an already completed duplicate so
-- Stripe retries if a previous worker stopped before recording completion.

create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
  v_reclaimed text;
  v_status text;
begin
  if nullif(trim(p_event_id), '') is null or nullif(trim(p_event_type), '') is null then
    raise exception 'Stripe event id and type are required';
  end if;

  insert into public.stripe_webhook_events (
    event_id,
    event_type,
    status,
    attempt_count,
    error_message,
    received_at,
    processed_at,
    updated_at
  )
  values (
    p_event_id,
    p_event_type,
    'processing',
    1,
    null,
    now(),
    null,
    now()
  )
  on conflict (event_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return 'claimed';
  end if;

  update public.stripe_webhook_events
  set status = 'processing',
      event_type = p_event_type,
      attempt_count = attempt_count + 1,
      error_message = null,
      processed_at = null,
      updated_at = now()
  where event_id = p_event_id
    and (
      status = 'error'
      or (status = 'processing' and updated_at < now() - interval '5 minutes')
    )
  returning event_id into v_reclaimed;

  if v_reclaimed is not null then
    return 'claimed';
  end if;

  select status into v_status
  from public.stripe_webhook_events
  where event_id = p_event_id;
  if v_status in ('processed', 'ignored') then
    return 'duplicate';
  end if;
  return 'busy';
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, text)
  from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, text)
  to service_role;
