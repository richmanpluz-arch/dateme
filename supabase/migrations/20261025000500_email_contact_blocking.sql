create table if not exists public.member_registered_contact_hashes (
 user_id uuid not null references auth.users(id) on delete cascade,
 contact_hash text not null,
 contact_type text not null default 'email' check(contact_type='email'),
 created_at timestamptz not null default now(),
 primary key(user_id,contact_hash)
);
alter table public.member_registered_contact_hashes enable row level security;
create or replace function public.sync_registered_email_hash()
returns trigger language plpgsql security definer set search_path=public,extensions
as $$
begin
 delete from public.member_registered_contact_hashes where user_id=new.id and contact_type='email';
 if new.email is not null and length(trim(new.email))>0 then
  insert into public.member_registered_contact_hashes(user_id,contact_hash,contact_type)
  values(new.id,encode(extensions.digest(convert_to(lower(trim(new.email)),'UTF8'),'sha256'),'hex'),'email')
  on conflict(user_id,contact_hash) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists sync_registered_email_hash_trigger on auth.users;
create trigger sync_registered_email_hash_trigger after insert or update of email on auth.users for each row execute function public.sync_registered_email_hash();
insert into public.member_registered_contact_hashes(user_id,contact_hash,contact_type)
select id,encode(extensions.digest(convert_to(lower(trim(email)),'UTF8'),'sha256'),'hex'),'email' from auth.users where email is not null and length(trim(email))>0
on conflict(user_id,contact_hash) do nothing;
create or replace function public.apply_contact_blocks()
returns integer language plpgsql security definer set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_count integer;
begin
 if v_user is null then raise exception 'Sign in required'; end if;
 insert into public.member_blocks(blocker_id,blocked_user_id)
 select v_user,registered.user_id from public.member_contact_block_hashes requested
 join public.member_registered_contact_hashes registered on registered.contact_hash=requested.contact_hash and registered.contact_type='email'
 where requested.user_id=v_user and registered.user_id<>v_user
 on conflict(blocker_id,blocked_user_id) do nothing;
 get diagnostics v_count = row_count;
 return v_count;
end $$;
revoke all on function public.apply_contact_blocks() from public;
grant execute on function public.apply_contact_blocks() to authenticated;