-- Ensure voice-note storage exists and is restricted to matched conversation participants.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dateme-voice-notes',
  'dateme-voice-notes',
  false,
  5242880,
  array['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav','audio/aac','audio/x-m4a']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Matched members can upload voice notes" on storage.objects;
create policy "Matched members can upload voice notes" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'dateme-voice-notes'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.matches mt
    where mt.id::text = (storage.foldername(name))[1]
      and auth.uid() in (mt.user_one, mt.user_two)
  )
);

drop policy if exists "Matched members can play voice notes" on storage.objects;
create policy "Matched members can play voice notes" on storage.objects
for select to authenticated
using (
  bucket_id = 'dateme-voice-notes'
  and exists (
    select 1 from public.matches mt
    where mt.id::text = (storage.foldername(name))[1]
      and auth.uid() in (mt.user_one, mt.user_two)
  )
);

drop policy if exists "Senders can remove their voice notes" on storage.objects;
create policy "Senders can remove their voice notes" on storage.objects
for delete to authenticated
using (
  bucket_id = 'dateme-voice-notes'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.matches mt
    where mt.id::text = (storage.foldername(name))[1]
      and auth.uid() in (mt.user_one, mt.user_two)
  )
);
