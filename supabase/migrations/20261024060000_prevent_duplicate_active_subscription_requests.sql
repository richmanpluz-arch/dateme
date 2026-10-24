create or replace function public.request_subscription_plan(p_plan_code text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_plan_code not in ('week','month','three_months','six_months','yearly') then
    raise exception 'Invalid subscription plan';
  end if;

  -- Owner/admin accounts never enter the paid request queue.
  if exists (select 1 from public.admin_users where user_id = v_uid) then
    insert into public.member_subscriptions(user_id, plan_code, status, payment_verified, starts_at, ends_at, approved_by, approved_at, updated_at)
    values (v_uid, 'yearly', 'active', true, now(), now() + interval '100 years', v_uid, now(), now())
    on conflict (user_id) do update set
      plan_code = 'yearly', status = 'active', payment_verified = true,
      starts_at = coalesce(public.member_subscriptions.starts_at, now()),
      ends_at = now() + interval '100 years', approved_by = v_uid, approved_at = now(), updated_at = now();
    return;
  end if;

  -- Never allow a new request to downgrade or overwrite a paid, unexpired subscription.
  if exists (
    select 1 from public.member_subscriptions s
    where s.user_id = v_uid and s.status = 'active'
      and s.payment_verified = true and s.ends_at > now()
  ) then
    raise exception 'You already have an active subscription. It remains active until it expires.';
  end if;

  -- Keep one pending request per member; the existing request must be reviewed first.
  if exists (
    select 1 from public.member_subscriptions s
    where s.user_id = v_uid and s.status = 'pending'
  ) then
    raise exception 'You already have a pending subscription request. Please wait for administrator review.';
  end if;

  insert into public.member_subscriptions(user_id, plan_code, status, payment_verified, starts_at, ends_at, approved_by, approved_at, updated_at)
  values (v_uid, p_plan_code, 'pending', false, null, null, null, null, now())
  on conflict (user_id) do update set
    plan_code = excluded.plan_code, status = 'pending', payment_verified = false,
    starts_at = null, ends_at = null, approved_by = null, approved_at = null, updated_at = now();
end;
$function$;
