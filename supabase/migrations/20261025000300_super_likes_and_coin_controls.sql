create or replace function public.send_super_like(p_target_user_id uuid)
returns integer language plpgsql security definer set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_balance integer;
begin
 if v_user is null then raise exception 'Sign in required'; end if;
 if p_target_user_id is null or p_target_user_id=v_user then raise exception 'Invalid target member'; end if;
 if not exists(select 1 from public.profiles where id=p_target_user_id) then raise exception 'Member not found'; end if;
 if exists(select 1 from public.member_blocks b where (b.blocker_id=v_user and b.blocked_user_id=p_target_user_id) or (b.blocker_id=p_target_user_id and b.blocked_user_id=v_user)) then raise exception 'Super Like unavailable because one member has blocked the other'; end if;
 if exists(select 1 from public.member_super_likes where sender_id=v_user and target_user_id=p_target_user_id) then raise exception 'You have already sent a Super Like to this member'; end if;
 insert into public.member_coin_wallets(user_id,balance) values(v_user,0) on conflict(user_id) do nothing;
 select balance into v_balance from public.member_coin_wallets where user_id=v_user for update;
 if v_balance<1 then raise exception 'You need at least one coin to send a Super Like'; end if;
 update public.member_coin_wallets set balance=balance-1,updated_at=now() where user_id=v_user returning balance into v_balance;
 insert into public.member_coin_transactions(user_id,amount,reason) values(v_user,-1,'super_like');
 insert into public.member_super_likes(sender_id,target_user_id) values(v_user,p_target_user_id);
 insert into public.likes(user_id,liked_user_id) values(v_user,p_target_user_id) on conflict(user_id,liked_user_id) do nothing;
 return v_balance;
end $$;
revoke all on function public.send_super_like(uuid) from public;
grant execute on function public.send_super_like(uuid) to authenticated;
create or replace function public.admin_adjust_member_coins(p_user_id uuid,p_amount integer,p_reason text)
returns integer language plpgsql security definer set search_path=public
as $$
declare v_balance integer;
begin
 if not public.is_dateme_admin() then raise exception 'Administrator access required'; end if;
 if p_user_id is null or p_amount=0 or abs(p_amount)>10000 then raise exception 'Invalid coin adjustment'; end if;
 insert into public.member_coin_wallets(user_id,balance) values(p_user_id,0) on conflict(user_id) do nothing;
 select balance into v_balance from public.member_coin_wallets where user_id=p_user_id for update;
 if v_balance+p_amount<0 then raise exception 'Coin balance cannot be negative'; end if;
 update public.member_coin_wallets set balance=balance+p_amount,updated_at=now() where user_id=p_user_id returning balance into v_balance;
 insert into public.member_coin_transactions(user_id,amount,reason) values(p_user_id,p_amount,left(coalesce(p_reason,'Admin adjustment'),200));
 return v_balance;
end $$;
revoke all on function public.admin_adjust_member_coins(uuid,integer,text) from public;
grant execute on function public.admin_adjust_member_coins(uuid,integer,text) to authenticated;