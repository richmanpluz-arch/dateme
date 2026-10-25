-- Additive DateMe member feature tables. Existing member/profile/payment records are untouched.
create table if not exists public.member_verification_submissions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 profile_photo_path text not null, live_video_path text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
 review_note text, reviewed_by uuid references auth.users(id), submitted_at timestamptz not null default now(), reviewed_at timestamptz
);
create table if not exists public.member_voice_intros (
 user_id uuid primary key references auth.users(id) on delete cascade, voice_path text,
 written_intro text not null default '' check(char_length(written_intro)<=500), updated_at timestamptz not null default now()
);
create table if not exists public.compatibility_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade, religion text, wants_children text, smoking text,
 relationship_goal text, preferred_distance_km integer not null default 10 check(preferred_distance_km in (5,10,50)),
 travel_mode boolean not null default false, hometown text, updated_at timestamptz not null default now()
);
create table if not exists public.member_coin_wallets (
 user_id uuid primary key references auth.users(id) on delete cascade, balance integer not null default 0 check(balance>=0), updated_at timestamptz not null default now()
);
create table if not exists public.member_coin_transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 amount integer not null check(amount<>0), reason text not null, created_at timestamptz not null default now()
);
create table if not exists public.member_super_likes (
 id uuid primary key default gen_random_uuid(), sender_id uuid not null references auth.users(id) on delete cascade,
 target_user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(),
 unique(sender_id,target_user_id), check(sender_id<>target_user_id)
);
create table if not exists public.member_profile_boosts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending_payment' check(status in ('pending_payment','scheduled','active','expired','cancelled')),
 starts_at timestamptz, ends_at timestamptz, payment_order_id uuid references public.subscription_payment_orders(id), created_at timestamptz not null default now()
);
create table if not exists public.dateme_events (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 3 and 120),
 description text not null default '' check(char_length(description)<=2000), city text not null default '', venue text not null default '',
 starts_at timestamptz not null, created_by uuid references auth.users(id), published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.dateme_event_attendees (
 event_id uuid not null references public.dateme_events(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'interested' check(status in ('interested','attending','cancelled')), created_at timestamptz not null default now(), primary key(event_id,user_id)
);
create table if not exists public.member_notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade, new_messages boolean not null default true, new_likes boolean not null default true,
 new_matches boolean not null default true, nearby_alerts boolean not null default false, nearby_radius_km integer not null default 10 check(nearby_radius_km in (5,10,50)),
 updated_at timestamptz not null default now()
);
create table if not exists public.member_contact_block_hashes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 contact_hash text not null, created_at timestamptz not null default now(), unique(user_id,contact_hash)
);
create table if not exists public.member_location_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade, city text, max_distance_km integer not null default 10 check(max_distance_km in (5,10,50)),
 travel_mode boolean not null default false, hometown text, updated_at timestamptz not null default now()
);
create table if not exists public.member_support_threads (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references auth.users(id) on delete cascade,
 subject text not null check(char_length(subject) between 3 and 160), status text not null default 'open' check(status in ('open','answered','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.member_support_messages (
 id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.member_support_threads(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade, body text not null check(char_length(body) between 1 and 4000),
 created_at timestamptz not null default now()
);
create or replace function public.is_dateme_admin() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;
create or replace function public.create_member_coin_wallet() returns trigger language plpgsql security definer set search_path=public
as $$ begin insert into public.member_coin_wallets(user_id,balance) values(new.id,0) on conflict(user_id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_create_coin_wallet on auth.users;
create trigger on_auth_user_create_coin_wallet after insert on auth.users for each row execute function public.create_member_coin_wallet();
insert into public.member_coin_wallets(user_id,balance) select id,0 from auth.users on conflict(user_id) do nothing;
alter table public.member_verification_submissions enable row level security;
alter table public.member_voice_intros enable row level security;
alter table public.compatibility_profiles enable row level security;
alter table public.member_coin_wallets enable row level security;
alter table public.member_coin_transactions enable row level security;
alter table public.member_super_likes enable row level security;
alter table public.member_profile_boosts enable row level security;
alter table public.dateme_events enable row level security;
alter table public.dateme_event_attendees enable row level security;
alter table public.member_notification_preferences enable row level security;
alter table public.member_contact_block_hashes enable row level security;
alter table public.member_location_preferences enable row level security;
alter table public.member_support_threads enable row level security;
alter table public.member_support_messages enable row level security;
drop policy if exists verification_select_own_or_admin on public.member_verification_submissions;
create policy verification_select_own_or_admin on public.member_verification_submissions for select to authenticated using(user_id=auth.uid() or public.is_dateme_admin());
drop policy if exists verification_insert_own on public.member_verification_submissions;
create policy verification_insert_own on public.member_verification_submissions for insert to authenticated with check(user_id=auth.uid() and status='pending');
drop policy if exists verification_admin_update on public.member_verification_submissions;
create policy verification_admin_update on public.member_verification_submissions for update to authenticated using(public.is_dateme_admin()) with check(public.is_dateme_admin());
drop policy if exists voice_intro_own_all on public.member_voice_intros;
create policy voice_intro_own_all on public.member_voice_intros for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists compatibility_own_all on public.compatibility_profiles;
create policy compatibility_own_all on public.compatibility_profiles for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists wallet_read_own_or_admin on public.member_coin_wallets;
create policy wallet_read_own_or_admin on public.member_coin_wallets for select to authenticated using(user_id=auth.uid() or public.is_dateme_admin());
drop policy if exists coin_transactions_read_own_or_admin on public.member_coin_transactions;
create policy coin_transactions_read_own_or_admin on public.member_coin_transactions for select to authenticated using(user_id=auth.uid() or public.is_dateme_admin());
drop policy if exists super_likes_read_participants on public.member_super_likes;
create policy super_likes_read_participants on public.member_super_likes for select to authenticated using(sender_id=auth.uid() or target_user_id=auth.uid() or public.is_dateme_admin());
drop policy if exists boosts_read_own_or_admin on public.member_profile_boosts;
create policy boosts_read_own_or_admin on public.member_profile_boosts for select to authenticated using(user_id=auth.uid() or public.is_dateme_admin());
drop policy if exists boosts_request_own on public.member_profile_boosts;
create policy boosts_request_own on public.member_profile_boosts for insert to authenticated with check(user_id=auth.uid() and status='pending_payment');
drop policy if exists events_read_published on public.dateme_events;
create policy events_read_published on public.dateme_events for select to authenticated using(published=true or public.is_dateme_admin());
drop policy if exists events_admin_manage on public.dateme_events;
create policy events_admin_manage on public.dateme_events for all to authenticated using(public.is_dateme_admin()) with check(public.is_dateme_admin());
drop policy if exists event_attendees_manage_own on public.dateme_event_attendees;
create policy event_attendees_manage_own on public.dateme_event_attendees for all to authenticated using(user_id=auth.uid() or public.is_dateme_admin()) with check(user_id=auth.uid() or public.is_dateme_admin());
drop policy if exists notification_prefs_own on public.member_notification_preferences;
create policy notification_prefs_own on public.member_notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists contact_hashes_own on public.member_contact_block_hashes;
create policy contact_hashes_own on public.member_contact_block_hashes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists location_prefs_own on public.member_location_preferences;
create policy location_prefs_own on public.member_location_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists support_thread_read_member_admin on public.member_support_threads;
create policy support_thread_read_member_admin on public.member_support_threads for select to authenticated using(member_id=auth.uid() or public.is_dateme_admin());
drop policy if exists support_thread_create_own on public.member_support_threads;
create policy support_thread_create_own on public.member_support_threads for insert to authenticated with check(member_id=auth.uid());
drop policy if exists support_thread_admin_update on public.member_support_threads;
create policy support_thread_admin_update on public.member_support_threads for update to authenticated using(public.is_dateme_admin()) with check(public.is_dateme_admin());
drop policy if exists support_messages_read_member_admin on public.member_support_messages;
create policy support_messages_read_member_admin on public.member_support_messages for select to authenticated using(public.is_dateme_admin() or exists(select 1 from public.member_support_threads t where t.id=thread_id and t.member_id=auth.uid()));
drop policy if exists support_messages_insert_member_admin on public.member_support_messages;
create policy support_messages_insert_member_admin on public.member_support_messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.member_support_threads t where t.id=thread_id and (t.member_id=auth.uid() or public.is_dateme_admin())));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('dateme-private-verification','dateme-private-verification',false,10485760,array['image/jpeg','image/png','image/webp','video/webm','video/mp4']) on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('dateme-voice-intros','dateme-voice-intros',false,5242880,array['audio/webm','audio/ogg','audio/mp4','audio/mpeg']) on conflict(id) do nothing;
drop policy if exists verification_storage_read_own_or_admin on storage.objects;
create policy verification_storage_read_own_or_admin on storage.objects for select to authenticated using(bucket_id='dateme-private-verification' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_dateme_admin()));
drop policy if exists verification_storage_insert_own on storage.objects;
create policy verification_storage_insert_own on storage.objects for insert to authenticated with check(bucket_id in ('dateme-private-verification','dateme-voice-intros') and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists voice_storage_read_own on storage.objects;
create policy voice_storage_read_own on storage.objects for select to authenticated using(bucket_id='dateme-voice-intros' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists voice_storage_delete_own on storage.objects;
create policy voice_storage_delete_own on storage.objects for delete to authenticated using(bucket_id='dateme-voice-intros' and (storage.foldername(name))[1]=auth.uid()::text);
