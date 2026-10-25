create table if not exists public.member_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 kind text not null check(kind in ('message','like','match','nearby','support','verification')),
 title text not null, body text not null default '', entity_id uuid, read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists member_notifications_user_created_idx on public.member_notifications(user_id,created_at desc);
alter table public.member_notifications enable row level security;
drop policy if exists notifications_read_own on public.member_notifications;
create policy notifications_read_own on public.member_notifications for select to authenticated using(user_id=auth.uid());
create or replace function public.notify_new_message() returns trigger language plpgsql security definer set search_path=public as $$
declare v_recipient uuid;
begin
 select case when m.user_one=new.sender_id then m.user_two else m.user_one end into v_recipient from public.matches m where m.id=new.match_id and new.sender_id in(m.user_one,m.user_two);
 if v_recipient is not null and coalesce((select new_messages from public.member_notification_preferences where user_id=v_recipient),true) then
 insert into public.member_notifications(user_id,actor_id,kind,title,body,entity_id) values(v_recipient,new.sender_id,'message','New message','You received a new DateMe message.',new.id); end if; return new;
end $$;
drop trigger if exists notify_new_message_trigger on public.messages;
create trigger notify_new_message_trigger after insert on public.messages for each row execute function public.notify_new_message();
create or replace function public.notify_new_like() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.user_id<>new.liked_user_id and coalesce((select new_likes from public.member_notification_preferences where user_id=new.liked_user_id),true) then
 insert into public.member_notifications(user_id,actor_id,kind,title,body) values(new.liked_user_id,new.user_id,'like','Someone likes you','A DateMe member liked your profile.'); end if; return new;
end $$;
drop trigger if exists notify_new_like_trigger on public.likes;
create trigger notify_new_like_trigger after insert on public.likes for each row execute function public.notify_new_like();
create or replace function public.notify_new_match() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if coalesce((select new_matches from public.member_notification_preferences where user_id=new.user_one),true) then insert into public.member_notifications(user_id,actor_id,kind,title,body,entity_id) values(new.user_one,new.user_two,'match','It is a match!','You have a new mutual match.',new.id); end if;
 if coalesce((select new_matches from public.member_notification_preferences where user_id=new.user_two),true) then insert into public.member_notifications(user_id,actor_id,kind,title,body,entity_id) values(new.user_two,new.user_one,'match','It is a match!','You have a new mutual match.',new.id); end if; return new;
end $$;
drop trigger if exists notify_new_match_trigger on public.matches;
create trigger notify_new_match_trigger after insert on public.matches for each row execute function public.notify_new_match();
drop policy if exists notifications_mark_own_read on public.member_notifications;
create or replace function public.mark_notification_read(p_notification_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin update public.member_notifications set read_at=coalesce(read_at,now()) where id=p_notification_id and user_id=auth.uid(); return found; end $$;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;