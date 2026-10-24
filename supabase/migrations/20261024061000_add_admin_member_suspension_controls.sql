create or replace function public.admin_set_member_suspension(p_user_id uuid, p_suspend boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin uuid := auth.uid();
begin
  if v_admin is null then
    raise exception 'Authentication required';
  end if;
  if not exists (select 1 from public.admin_users a where a.user_id = v_admin) then
    raise exception 'Administrator access required';
  end if;
  if p_user_id is null then
    raise exception 'Member ID is required';
  end if;
  if p_suspend and p_user_id = v_admin then
    raise exception 'Administrators cannot suspend their own account through this control';
  end if;

  insert into public.member_safety_status(user_id, strike_count, suspended_until, updated_at)
  values (p_user_id, 0, case when p_suspend then now() + interval '24 hours' else null end, now())
  on conflict (user_id) do update
    set suspended_until = case when p_suspend then now() + interval '24 hours' else null end,
        updated_at = now();
end;
$function$;

revoke execute on function public.admin_set_member_suspension(uuid, boolean) from public, anon;
grant execute on function public.admin_set_member_suspension(uuid, boolean) to authenticated;
