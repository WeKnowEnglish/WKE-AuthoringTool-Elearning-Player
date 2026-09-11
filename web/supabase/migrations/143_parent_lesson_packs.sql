-- Parent lesson packs: admin-priced packages of 8 lessons (or multiples of 8),
-- Stripe Checkout orders, and per-student remaining lesson credits.

alter table public.parent_profiles
  add column if not exists stripe_customer_id text;

create table if not exists public.lesson_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  lesson_count int not null,
  unit_amount int not null,
  currency text not null default 'vnd',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_packages_name_len
    check (char_length(name) between 2 and 80),
  constraint lesson_packages_description_len
    check (char_length(description) <= 500),
  constraint lesson_packages_lesson_count_packs
    check (lesson_count > 0 and lesson_count % 8 = 0 and lesson_count <= 96),
  constraint lesson_packages_unit_amount_positive
    check (unit_amount > 0),
  constraint lesson_packages_currency_iso
    check (currency ~ '^[a-z]{3}$')
);

create table if not exists public.lesson_pack_orders (
  id uuid primary key default gen_random_uuid(),
  guardian_user_id uuid not null references auth.users(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  package_id uuid not null references public.lesson_packages(id) on delete restrict,
  quantity int not null,
  lesson_count int not null,
  unit_amount int not null,
  currency text not null,
  status text not null default 'pending',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_pack_orders_quantity
    check (quantity >= 1 and quantity <= 12),
  constraint lesson_pack_orders_lesson_count
    check (lesson_count > 0),
  constraint lesson_pack_orders_unit_amount
    check (unit_amount > 0),
  constraint lesson_pack_orders_status
    check (status in ('pending', 'paid', 'canceled', 'expired', 'refunded')),
  constraint lesson_pack_orders_not_self
    check (guardian_user_id <> student_id)
);

create table if not exists public.student_lesson_credits (
  student_id uuid primary key references auth.users(id) on delete cascade,
  remaining_lessons int not null default 0,
  updated_at timestamptz not null default now(),
  constraint student_lesson_credits_remaining
    check (remaining_lessons >= 0)
);

create table if not exists public.student_lesson_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.lesson_pack_orders(id) on delete set null,
  delta int not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint student_lesson_credit_ledger_reason_len
    check (char_length(reason) between 3 and 40)
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processed',
  error_message text,
  received_at timestamptz not null default now(),
  constraint stripe_webhook_events_status
    check (status in ('processed', 'error', 'ignored'))
);

create unique index if not exists student_lesson_credit_ledger_order_purchase_idx
  on public.student_lesson_credit_ledger(order_id)
  where order_id is not null and reason = 'pack_purchase';

create index if not exists lesson_packages_active_sort_idx
  on public.lesson_packages(is_active, sort_order, created_at);

create index if not exists lesson_pack_orders_guardian_created_idx
  on public.lesson_pack_orders(guardian_user_id, created_at desc);

create index if not exists lesson_pack_orders_student_status_idx
  on public.lesson_pack_orders(student_id, status, created_at desc);

create index if not exists student_lesson_credit_ledger_student_idx
  on public.student_lesson_credit_ledger(student_id, created_at desc);

insert into public.lesson_packages (
  name,
  description,
  lesson_count,
  unit_amount,
  currency,
  is_active,
  sort_order
)
select
  '8-lesson pack',
  'Eight lessons for one child. Change this price in Admin → Packages before going live.',
  8,
  2000000,
  'vnd',
  true,
  0
where not exists (select 1 from public.lesson_packages);

alter table public.lesson_packages enable row level security;
alter table public.lesson_pack_orders enable row level security;
alter table public.student_lesson_credits enable row level security;
alter table public.student_lesson_credit_ledger enable row level security;
alter table public.stripe_webhook_events enable row level security;

grant select on public.lesson_packages to authenticated;
grant select on public.lesson_pack_orders to authenticated;
grant select on public.student_lesson_credits to authenticated;

create policy lesson_packages_select_active
  on public.lesson_packages for select to authenticated
  using (is_active = true);

create policy lesson_pack_orders_select_own
  on public.lesson_pack_orders for select to authenticated
  using (guardian_user_id = auth.uid());

create policy student_lesson_credits_select_guardian
  on public.student_lesson_credits for select to authenticated
  using (public.is_active_guardian(student_id));

comment on table public.lesson_packages is
  'Admin-priced lesson packs sold to parents. Amounts use Stripe smallest currency units.';
comment on table public.lesson_pack_orders is
  'Parent Stripe Checkout purchases. Credits are granted only after status = paid.';
comment on table public.student_lesson_credits is
  'Remaining prepaid lessons per student. Incremented by paid pack purchases.';
create or replace function public.grant_lesson_pack_purchase(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_ledger_id uuid;
begin
  select id, student_id, lesson_count, status
    into v_order
  from public.lesson_pack_orders
  where id = p_order_id;

  if not found or v_order.status <> 'paid' then
    return false;
  end if;

  insert into public.student_lesson_credit_ledger(student_id, order_id, delta, reason)
  values (v_order.student_id, v_order.id, v_order.lesson_count, 'pack_purchase')
  on conflict do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    return true;
  end if;

  insert into public.student_lesson_credits(student_id, remaining_lessons, updated_at)
  values (v_order.student_id, v_order.lesson_count, now())
  on conflict (student_id)
  do update set
    remaining_lessons = public.student_lesson_credits.remaining_lessons + excluded.remaining_lessons,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.grant_lesson_pack_purchase(uuid) from public, anon, authenticated;
grant execute on function public.grant_lesson_pack_purchase(uuid) to service_role;

comment on table public.stripe_webhook_events is
  'Idempotency log for Stripe webhook event ids. Service role only.';
