-- DateMe safety rule: voice notes and all external contact exchange require
-- active, verified yearly subscriptions for both people in the conversation.
-- This is enforced server-side as well as in the client.

create or replace function public.dateme_voice_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.member_subscriptions s
     where s.user_id = p_user_id
       and s.plan_code = 'yearly'
       and s.status = 'active'
       and s.payment_verified is true
       and s.ends_at > now()
  );
$function$;

revoke all on function public.dateme_voice_access(uuid) from public;
grant execute on function public.dateme_voice_access(uuid) to authenticated;

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

  if new.audio_path is not null then
    if not public.dateme_voice_access(new.sender_id)
       or not public.dateme_voice_access(v_receiver_id) then
      raise exception 'VOICE_SUBSCRIPTION_REQUIRED: Both members need an active, verified one-year subscription to exchange voice notes.';
    end if;
    return new;
  end if;

  -- Text messages containing external contact details are not permitted at any tier.
  -- The existing safety trigger redacts detected contact-sharing attempts; this
  -- additional guard catches long number sequences written as words as well.
  if coalesce(new.body, '') ~* '(\m(zero|one|two|three|four|five|six|seven|eight|nine|oh)([[:space:],.-]+(zero|one|two|three|four|five|six|seven|eight|nine|oh)){6,}\M)'
     or coalesce(new.body, '') ~* '(\+?[0-9][0-9[:space:]().-]{6,}[0-9])' then
    raise exception 'CONTACT_DETAILS_BLOCKED: Phone numbers and contact details cannot be exchanged in DateMe chat.';
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

-- Storage authorization also checks both members, so previously shared voice notes
-- become unplayable when either participant is not currently a verified yearly member.
drop policy if exists "Matched members can play voice notes" on storage.objects;
create policy "Matched members can play voice notes" on storage.objects
for select to authenticated
using (
  bucket_id = 'dateme-voice-notes'
  and exists (
    select 1
      from public.matches mt
     where mt.id::text = (storage.foldername(name))[1]
       and auth.uid() in (mt.user_one, mt.user_two)
       and public.dateme_voice_access(mt.user_one)
       and public.dateme_voice_access(mt.user_two)
  )
);

-- Revoke obvious phone-number strings already present in chat history.
-- Preserve the rows and timestamps while replacing the sensitive message body.
update public.messages
   set body = '*********',
       audio_path = null
 where audio_path is null
   and coalesce(body, '') ~* '(\+?[0-9][0-9[:space:]().-]{6,}[0-9])';

-- Old voice messages cannot be played by non-yearly members after the storage
-- policy above; no production deployment is performed by this migration file alone.
