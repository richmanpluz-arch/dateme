create or replace function public.notify_new_member_report()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.member_notifications(user_id,actor_id,kind,title,body,entity_id)
 select a.user_id,new.reporter_id,'support','New safety report','A member submitted a safety report about another account.',new.id from public.admin_users a;
 return new;
end $$;
revoke execute on function public.notify_new_member_report() from public,anon,authenticated;
drop trigger if exists notify_new_member_report_trigger on public.member_reports;
create trigger notify_new_member_report_trigger after insert on public.member_reports for each row execute function public.notify_new_member_report();