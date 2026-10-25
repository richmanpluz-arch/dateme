revoke execute on function public.admin_set_member_suspension(uuid,boolean) from public,anon;
grant execute on function public.admin_set_member_suspension(uuid,boolean) to authenticated;
revoke execute on function public.admin_set_subscription(uuid,text,boolean) from public,anon;
grant execute on function public.admin_set_subscription(uuid,text,boolean) to authenticated;
revoke execute on function public.dateme_can_exchange_voice(uuid) from public,anon;
grant execute on function public.dateme_can_exchange_voice(uuid) to authenticated;
revoke execute on function public.dateme_enforce_voice_entitlement() from public,anon,authenticated;
revoke execute on function public.enforce_member_media_limits() from public,anon,authenticated;