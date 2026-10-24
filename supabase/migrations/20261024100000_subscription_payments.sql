-- Subscription payments: server-owned pricing, order ledger, and idempotent activation.
create table if not exists public.subscription_plan_prices (
  plan_code text primary key check (plan_code in ('week','month','three_months','six_months','yearly')),
  price_zar numeric(12,2),
  price_usd numeric(12,2),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint subscription_plan_prices_positive check (
    (price_zar is null or price_zar > 0) and (price_usd is null or price_usd > 0)
  )
);

insert into public.subscription_plan_prices (plan_code, price_zar, price_usd, enabled)
values ('week',null,null,false),('month',null,null,false),('three_months',null,null,false),('six_months',null,null,false),('yearly',null,null,false)
on conflict (plan_code) do nothing;

create table if not exists public.subscription_payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('week','month','three_months','six_months','yearly')),
  provider text not null check (provider in ('nowpayments','kora_1voucher')),
  status text not null default 'pending' check (status in ('pending','succeeded','failed','expired')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('USD','ZAR')),
  provider_reference text not null unique,
  provider_payment_id text,
  checkout_url text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,
  unique (user_id, idempotency_key)
);

create index if not exists subscription_payment_orders_user_created_idx
  on public.subscription_payment_orders (user_id, created_at desc);
create index if not exists subscription_payment_orders_status_idx
  on public.subscription_payment_orders (status, created_at);

alter table public.subscription_plan_prices enable row level security;
alter table public.subscription_payment_orders enable row level security;

drop policy if exists "Members can read their own payment orders" on public.subscription_payment_orders;
create policy "Members can read their own payment orders"
  on public.subscription_payment_orders for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.subscription_plan_prices from anon, authenticated;
revoke all on public.subscription_payment_orders from anon, authenticated;
grant select on public.subscription_payment_orders to authenticated;

create or replace function public.finalize_subscription_payment(p_order_id uuid, p_provider_payment_id text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.subscription_payment_orders%rowtype;
  v_duration interval;
begin
  select * into v_order
  from public.subscription_payment_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Payment order not found';
  end if;

  if v_order.status = 'succeeded' then
    return;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Payment order is not pending';
  end if;

  v_duration := case v_order.plan_code
    when 'week' then interval '7 days'
    when 'month' then interval '1 month'
    when 'three_months' then interval '3 months'
    when 'six_months' then interval '6 months'
    when 'yearly' then interval '1 year'
    else null
  end;

  if v_duration is null then
    raise exception 'Unsupported subscription plan';
  end if;

  update public.subscription_payment_orders
  set status = 'succeeded',
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      paid_at = now(),
      updated_at = now()
  where id = p_order_id;

  update public.member_subscriptions
  set plan_code = v_order.plan_code,
      status = 'active',
      starts_at = now(),
      ends_at = now() + v_duration,
      payment_verified = true
  where user_id = v_order.user_id;

  if not found then
    insert into public.member_subscriptions
      (user_id, plan_code, status, starts_at, ends_at, payment_verified)
    values
      (v_order.user_id, v_order.plan_code, 'active', now(), now() + v_duration, true);
  end if;
end;
$$;

revoke all on function public.finalize_subscription_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.finalize_subscription_payment(uuid, text) to service_role;
