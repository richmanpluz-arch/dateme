-- Fix a global storage.objects trigger that incorrectly rejected uploads to every bucket
-- because auth.uid() was checked before filtering for the one bucket it protects.
create or replace function public.guard_subscription_media_storage()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_match_id uuid;
  v_other uuid;
  v_sender public.member_subscriptions%rowtype;
  v_receiver public.member_subscriptions%rowtype;
begin
  -- This trigger is only intended to enforce rules for chat-media uploads.
  -- Return immediately for voice notes, avatars, profile media, and all other buckets.
  if coalesce(new.bucket_id, '') <> 'dateme-chat-media' then
    return new;
  end if;

  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  begin
    v_match_id := split_part(new.name, '/', 1)::uuid;
  exception when others then
    raise exception 'Invalid chat media path.';
  end;

  select case when user_one = v_uid then user_two else user_one end
    into v_other
    from public.matches
   where id = v_match_id and v_uid in (user_one, user_two);

  if v_other is null then
    raise exception 'Chat media is available only in your own matches.';
  end if;

  select * into v_sender from public.member_subscriptions where user_id = v_uid;
  select * into v_receiver from public.member_subscriptions where user_id = v_other;

  if not (
    v_sender.status = 'active' and v_sender.payment_verified and v_sender.ends_at > now()
    and v_receiver.status = 'active' and v_receiver.payment_verified and v_receiver.ends_at > now()
    and v_sender.plan_code = v_receiver.plan_code
  ) then
    raise exception 'MEDIA_NOT_ALLOWED: Both members must have the same active paid subscription tier to share media.';
  end if;

  return new;
end;
$function$;
