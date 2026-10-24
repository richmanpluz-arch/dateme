create or replace function public.make_affiliate_account()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_code text;
begin
  if new.id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.affiliate_accounts where user_id = new.id
  ) then
    v_code := upper(substr(pg_catalog.encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));
    insert into public.affiliate_accounts(user_id, referral_code)
      values (new.id, v_code)
      on conflict (user_id) do nothing;
  end if;

  insert into public.member_subscriptions(user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  return new;
end;
$function$;
