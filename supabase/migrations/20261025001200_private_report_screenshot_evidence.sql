alter table public.member_reports add column if not exists evidence_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('dateme-report-evidence','dateme-report-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists report_evidence_upload_own on storage.objects;
create policy report_evidence_upload_own on storage.objects for insert to authenticated with check(bucket_id='dateme-report-evidence' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists report_evidence_read_owner_or_admin on storage.objects;
create policy report_evidence_read_owner_or_admin on storage.objects for select to authenticated using(bucket_id='dateme-report-evidence' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.admin_users a where a.user_id=auth.uid())));
drop policy if exists report_evidence_delete_owner on storage.objects;
create policy report_evidence_delete_owner on storage.objects for delete to authenticated using(bucket_id='dateme-report-evidence' and (storage.foldername(name))[1]=auth.uid()::text);