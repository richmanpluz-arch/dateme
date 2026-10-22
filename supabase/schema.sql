-- DateMe starter schema. Safe to run in the Supabase SQL Editor for this project.
-- Public profile fields only: do not store email addresses or secrets in this table.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  age smallint check (age is null or age between 18 and 120),
  city text check (city is null or char_length(city) <= 100),
  bio text check (bio is null or char_length(bio) <= 500),
  photo_url text check (photo_url is null or char_length(photo_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  liked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_not_self check (user_id <> liked_user_id),
  constraint likes_unique_pair unique (user_id, liked_user_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_one uuid not null references public.profiles(id) on delete cascade,
  user_two uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint matches_not_self check (user_one <> user_two),
  constraint matches_canonical_order check (user_one < user_two),
  constraint matches_unique_pair unique (user_one, user_two)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
create index if not exists likes_liked_user_id_idx on public.likes (liked_user_id);
create index if not exists matches_user_one_idx on public.matches (user_one);
create index if not exists matches_user_two_idx on public.matches (user_two);
create index if not exists messages_match_created_idx on public.messages (match_id, created_at);
create index if not exists messages_sender_id_idx on public.messages (sender_id);

alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

-- Public profile fields are intended to be discoverable by signed-in members.
drop policy if exists "Signed-in users can discover profiles" on public.profiles;
create policy "Signed-in users can discover profiles"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Members can create their own profile" on public.profiles;
create policy "Members can create their own profile"
  on public.profiles for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Members can update their own profile" on public.profiles;
create policy "Members can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Members can delete their own profile" on public.profiles;
create policy "Members can delete their own profile"
  on public.profiles for delete to authenticated using ((select auth.uid()) = id);

drop policy if exists "Members can read likes they sent" on public.likes;
create policy "Members can read likes they sent"
  on public.likes for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Members can send their own likes" on public.likes;
create policy "Members can send their own likes"
  on public.likes for insert to authenticated
  with check ((select auth.uid()) = user_id and (select auth.uid()) <> liked_user_id);

drop policy if exists "Members can remove their own likes" on public.likes;
create policy "Members can remove their own likes"
  on public.likes for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Matched members can read their matches" on public.matches;
create policy "Matched members can read their matches"
  on public.matches for select to authenticated
  using ((select auth.uid()) = user_one or (select auth.uid()) = user_two);

drop policy if exists "Matched members can read messages" on public.messages;
create policy "Matched members can read messages"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.matches m
    where m.id = match_id
      and ((select auth.uid()) = m.user_one or (select auth.uid()) = m.user_two)
  ));

drop policy if exists "Matched members can send messages as themselves" on public.messages;
create policy "Matched members can send messages as themselves"
  on public.messages for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and ((select auth.uid()) = m.user_one or (select auth.uid()) = m.user_two)
    )
  );

-- Create a profile row automatically after a new auth account is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 60), ''),
      'New member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();



-- Create a match automatically when two members like each other.
create or replace function public.create_match_on_mutual_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
begin
  if exists (
    select 1 from public.likes l
    where l.user_id = new.liked_user_id
      and l.liked_user_id = new.user_id
  ) then
    insert into public.matches (user_one, user_two)
    values (least(new.user_id, new.liked_user_id), greatest(new.user_id, new.liked_user_id))
    on conflict (user_one, user_two) do nothing;
  end if;
  return new;
end;
$;

revoke execute on function public.create_match_on_mutual_like() from public, anon, authenticated;

drop trigger if exists on_mutual_like_created on public.likes;
create trigger on_mutual_like_created
  after insert on public.likes
  for each row execute function public.create_match_on_mutual_like();

-- Enable message insert events for live chat, without failing if already enabled.
do $
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $;

