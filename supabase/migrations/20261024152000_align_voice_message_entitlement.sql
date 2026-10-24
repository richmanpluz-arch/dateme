-- Make the message trigger agree with the existing DateMe voice-note entitlement.
-- Voice notes are permitted for the approved admin/test accounts and verified yearly members.
-- Text-message subscription-tier rules remain unchanged.
create or replace function public.enforce_subscription_tier_chat()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_sender public.member_subscriptions%rowtype;
  v_receiver public.member_subscriptions%rowtype;
  v_receiver_id uuid;
  v_sender_plan text;
  v_receiver_plan text;
  v_sender_paid boolean := false;
  v_receiver_paid boolean := false;
  v_sender_promo boolean := false;
  v_receiver_promo boolean := false;
begin
  if auth.uid() is null or auth.uid() <> new.sender_id then
    raise exception 'You can only send messages from your own account.';
  end if;

  select case when m.user_one = new.sender_id then m.user_two else m.user_one end
    into v_receiver_id
    from public.matches m
   where m.id = new.match_id
     and new.sender_id in (m.user_one, m.user_two);

  if v_receiver_id is null then
    raise exception 'Messaging is only available to matched members.';
  end if;

  -- Handle voice notes using the same explicit entitlement check used by the client
  -- and the dateme_enforce_voice_entitlement trigger. Do not apply the separate
  -- same-paid-tier text-chat rule to an otherwise approved voice-note sender.
  if new.audio_path is not null then
    if not public.dateme_voice_access(new.sender_id) then
      raise exception 'VOICE_SUBSCRIPTION_REQUIRED';
    end if;
    return new;
  end if;

  insert into public.member_subscriptions(user_id)
  values (new.sender_id), (v_receiver_id)
  on conflict (user_id) do nothing;

  select * into v_sender from public.member_subscriptions where user_id = new.sender_id;
  select * into v_receiver from public.member_subscriptions where user_id = v_receiver_id;

  v_sender_paid := v_sender.status = 'active' and v_sender.payment_verified and v_sender.ends_at > now();
  v_receiver_paid := v_receiver.status = 'active' and v_receiver.payment_verified and v_receiver.ends_at > now();
  v_sender_plan := case when v_sender_paid then v_sender.plan_code else 'free' end;
  v_receiver_plan := case when v_receiver_paid then v_receiver.plan_code else 'free' end;
  v_sender_promo := not v_sender_paid and v_sender.promo_chat_until > now()
    and v_sender.promo_last_activity_at > now() - interval '24 hours';
  v_receiver_promo := not v_receiver_paid and v_receiver.promo_chat_until > now()
    and v_receiver.promo_last_activity_at > now() - interval '24 hours';

  if v_sender_paid or v_receiver_paid then
    if not (v_sender_paid and v_receiver_paid and v_sender_plan = v_receiver_plan) then
      raise exception 'SUBSCRIPTION_TIER_MISMATCH: Both members must have the same active, verified subscription tier to use paid-tier messaging.';
    end if;
  elsif v_sender_plan = 'free' and v_receiver_plan = 'free' then
    null;
  else
    raise exception 'PROMO_CHAT_NOT_ACTIVE: Promotional chat is unavailable until eligibility is restored.';
  end if;

  return new;
end;
$function$;
