create or replace function public.attach_member_report_evidence(p_report_id uuid,p_evidence_path text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_evidence_path !~ ('^'||auth.uid()::text||'/'||p_report_id::text||'/[^/]+$') then raise exception 'Invalid evidence path'; end if;
 update public.member_reports set evidence_path=p_evidence_path where id=p_report_id and reporter_id=auth.uid();
 return found;
end $$;
revoke execute on function public.attach_member_report_evidence(uuid,text) from public,anon;
grant execute on function public.attach_member_report_evidence(uuid,text) to authenticated;