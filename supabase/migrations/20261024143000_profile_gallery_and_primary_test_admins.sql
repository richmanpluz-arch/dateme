-- DateMe profile gallery, media retention support, and primary test-owner access.
create table if not exists public.member_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('photo','video')),
  storage_path text not null unique,
  public_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists member_media_user_created_idx on public.member_media(user_id, created_at desc);
alter table public.member_media enable row level security;
grant select, insert, delete on public.member_media to authenticated;

drop policy if exists "Authenticated members can view profile gallery media" on public.member_media;
create policy "Authenticated members can view profile gallery media" on public.member_media
for select to authenticated using (auth.uid() is not null);

drop policy if exists "Members can add their own profile gallery media" on public.member_media;
create policy "Members can add their own profile gallery media" on public.member_media
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Members can remove their own profile gallery media" on public.member_media;
create policy "Members can remove their own profile gallery media" on public.member_media
for delete to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dateme-profile-media',
  'dateme-profile-media',
  true,
  26214400,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can view profile gallery objects" on storage.objects;
create policy "Members can view profile gallery objects" on storage.objects
for select to authenticated using (bucket_id = 'dateme-profile-media');

drop policy if exists "Members can upload into their own profile gallery" on storage.objects;
create policy "Members can upload into their own profile gallery" on storage.objects
for insert to authenticated with check (
  bucket_id = 'dateme-profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members can delete their own profile gallery objects" on storage.objects;
create policy "Members can delete their own profile gallery objects" on storage.objects
for delete to authenticated using (
  bucket_id = 'dateme-profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- These two owner-approved accounts are primary DateMe test/admin accounts.
insert into public.admin_users (user_id)
select id from auth.users
where lower(email) in ('mloirvine@gmail.com', 'richmanpluz@gmail.com')
on conflict (user_id) do nothing;

create or replace function public.dateme_voice_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'auth'
as $function$
  select p_user_id = auth.uid() and (
    lower(coalesce(auth.jwt()->>'email','')) in ('mloirvine@gmail.com','richmanpluz@gmail.com')
    or exists (select 1 from public.admin_users a where a.user_id = auth.uid())
    or exists (
      select 1 from public.member_subscriptions s
      where s.user_id = auth.uid()
        and s.plan_code = 'yearly'
        and s.status = 'active'
        and s.payment_verified = true
        and s.ends_at > now()
    )
  );
$function$;
