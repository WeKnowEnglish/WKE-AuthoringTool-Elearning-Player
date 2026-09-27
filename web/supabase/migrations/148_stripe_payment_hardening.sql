-- Stripe payment hardening: exact Checkout reconciliation, retry-safe webhook
-- claims, and refund/dispute review signals. Refunds never silently remove a
-- student's lessons; administrators resolve the educational entitlement.

alter table public.lesson_pack_orders
  add column if not exists stripe_livemode boolean,
  add column if not exists stripe_charge_id text,
  add column if not exists refund_status text not null default 'none',
  add column if not exists refunded_amount int not null default 0,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_review_required boolean not null default false,
  add column if not exists stripe_dispute_id text,
  add column if not exists stripe_dispute_status text;

alter table public.lesson_pack_orders
  drop constraint if exists lesson_pack_orders_refund_status;
alter table public.lesson_pack_orders
  add constraint lesson_pack_orders_refund_status
    check (refund_status in ('none', 'pending', 'partial', 'full', 'failed'));

alter table public.lesson_pack_orders
  drop constraint if exists lesson_pack_orders_refunded_amount;
alter table public.lesson_pack_orders
  add constraint lesson_pack_orders_refunded_amount
    check (
      refunded_amount >= 0
      and refunded_amount::bigint <= unit_amount::bigint * quantity::bigint
    );

create unique index if not exists lesson_pack_orders_payment_intent_uidx
  on public.lesson_pack_orders(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists lesson_pack_orders_charge_uidx
  on public.lesson_pack_orders(stripe_charge_id)
  where stripe_charge_id is not null;

create index if not exists lesson_pack_orders_payment_review_idx
  on public.lesson_pack_orders(refund_review_required, updated_at desc)
  where refund_review_required = true;

alter table public.stripe_webhook_events
  add column if not exists attempt_count int not null default 1,
  add column if not exists processed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.stripe_webhook_events
set processed_at = coalesce(processed_at, received_at),
    updated_at = coalesce(updated_at, received_at)
where status in ('processed', 'ignored');

alter table public.stripe_webhook_events
  alter column status set default 'processing';
alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_status;
alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status
    check (status in ('processing', 'processed', 'error', 'ignored'));

alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_attempt_count;
alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_attempt_count
    check (attempt_count >= 1);

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
  return 'duplicate';
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, text)
  from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, text)
  to service_role;

comment on function public.claim_stripe_webhook_event(text, text) is
  'Atomically claims new, failed, or stale Stripe webhook deliveries for service-role processing.';
comment on column public.lesson_pack_orders.refund_review_required is
  'True when an administrator must reconcile refunded/disputed money with lesson entitlements.';
