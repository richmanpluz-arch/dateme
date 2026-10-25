create or replace function public.dateme_content_safety_guard()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_reasons text[]:=array[]::text[]; v_strikes integer:=0; v_original text:=coalesce(new.body,'');
begin
 if new.sender_id is null or v_original='' then return new; end if;
 if v_original ~* '\\b(nudes?|naked|pornography|explicit sex|send nudes|sex video)\\b' then v_reasons:=array_append(v_reasons,'sexual_content'); end if;
 if v_original ~* '\\b(kill you|hurt you|rape you|shoot you|stab you|bomb threat|i will attack you|i will find you and hurt you)\\b' then v_reasons:=array_append(v_reasons,'threats_or_violence'); end if;
 if v_original ~* '\\b(cocaine|heroin|methamphetamine|crystal meth|fentanyl|sell guns|buy a gun|unlicensed firearm|buy weapons)\\b' then v_reasons:=array_append(v_reasons,'illegal_drugs_or_weapons'); end if;
 if v_original ~* '\\b(send me money now|wire transfer|share your otp|send your bank pin|guaranteed investment|double your money|send me your verification code)\\b' then v_reasons:=array_append(v_reasons,'scam_or_financial_coercion'); end if;
 if coalesce(array_length(v_reasons,1),0)=0 then return new; end if;
 insert into public.member_safety_status(user_id) values(new.sender_id) on conflict(user_id) do nothing;
 select strike_count into v_strikes from public.member_safety_status where user_id=new.sender_id for update;
 v_strikes:=coalesce(v_strikes,0)+1;
 update public.member_safety_status set strike_count=case when v_strikes>=3 then 0 else v_strikes end,suspended_until=case when v_strikes>=3 then now()+interval '24 hours' else suspended_until end,updated_at=now() where user_id=new.sender_id;
 insert into public.member_safety_events(user_id,original_message,detected_reasons,strike_number,action_taken) values(new.sender_id,left(v_original,2000),v_reasons,v_strikes,case when v_strikes>=3 then 'suspended_24h' else 'content_redacted_warning' end);
 new.body:='*********'; return new;
end $$;
revoke execute on function public.dateme_content_safety_guard() from public,anon,authenticated;
drop trigger if exists dateme_content_safety_guard_trigger on public.messages;
drop trigger if exists message_content_safety_guard_trigger on public.messages;
create trigger message_content_safety_guard_trigger before insert on public.messages for each row execute function public.dateme_content_safety_guard();