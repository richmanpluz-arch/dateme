-- Allow verified DateMe administrators to configure subscription prices and review payment orders.
grant select, update on public.subscription_plan_prices to authenticated;
grant select on public.subscription_payment_orders to authenticated;

drop policy if exists "Admins can manage subscription plan prices" on public.subscription_plan_prices;
create policy "Admins can manage subscription plan prices"
  on public.subscription_plan_prices for all to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));

drop policy if exists "Admins can read all payment orders" on public.subscription_payment_orders;
create policy "Admins can read all payment orders"
  on public.subscription_payment_orders for select to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));
