create or replace function public.notify_member_report_status()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.status is distinct from old.status and new.status in ('reviewing','resolved','dismissed') then
  insert into public.member_notifications(user_id,actor_id,kind,title,body,entity_id)
  values(new.reporter_id,null,'support','Safety report update',
   case when new.status='reviewing' then 'Your safety report is being reviewed by DateMe moderators.' when new.status='resolved' then 'DateMe moderators have completed their review of your safety report.' else 'DateMe moderators have closed your safety report after review.' end,new.id);
 end if;
 return new;
end $$;
revoke execute on function public.notify_member_report_status() from public,anon,authenticated;
drop trigger if exists notify_member_report_status_trigger on public.member_reports;
create trigger notify_member_report_status_trigger after update of status on public.member_reports for each row execute function public.notify_member_report_status();