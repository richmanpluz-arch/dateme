create or replace function public.notify_new_verification_submission()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.member_notifications(user_id,actor_id,kind,title,body,entity_id)
 select a.user_id,new.user_id,'verification','New identity verification','A member submitted a profile photo and live selfie video for review.',new.id from public.admin_users a;
 return new;
end $$;
revoke execute on function public.notify_new_verification_submission() from public,anon,authenticated;
drop trigger if exists notify_new_verification_submission_trigger on public.member_verification_submissions;
create trigger notify_new_verification_submission_trigger after insert on public.member_verification_submissions for each row execute function public.notify_new_verification_submission();