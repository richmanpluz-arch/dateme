alter table public.member_registered_contact_hashes drop constraint if exists member_registered_contact_hashes_contact_type_check;
alter table public.member_registered_contact_hashes add constraint member_registered_contact_hashes_contact_type_check check(contact_type in ('email','phone'));
create or replace function public.sync_registered_email_hash()
returns trigger language plpgsql security definer set search_path=public,extensions
as $$
begin
 delete from public.member_registered_contact_hashes where user_id=new.id;
 if new.email is not null and length(trim(new.email))>0 then
  insert into public.member_registered_contact_hashes(user_id,contact_hash,contact_type) values(new.id,encode(extensions.digest(convert_to(lower(trim(new.email)),'UTF8'),'sha256'),'hex'),'email')
  on conflict(user_id,contact_hash) do update set contact_type=excluded.contact_type;
 end if;
 if new.phone is not null and new.phone_confirmed_at is not null and length(trim(new.phone))>=8 then
  insert into public.member_registered_contact_hashes(user_id,contact_hash,contact_type) values(new.id,encode(extensions.digest(convert_to(trim(new.phone),'UTF8'),'sha256'),'hex'),'phone')
  on conflict(user_id,contact_hash) do update set contact_type=excluded.contact_type;
 end if;
 return new;
end $$;
drop trigger if exists sync_registered_email_hash_trigger on auth.users;
create trigger sync_registered_email_hash_trigger after insert or update of email,phone,phone_confirmed_at on auth.users for each row execute function public.sync_registered_email_hash();
delete from public.member_registered_contact_hashes;
insert into public.member_registered_contact_hashes(user_id,contact_hash,contact_type)
select id,encode(extensions.digest(convert_to(lower(trim(email)),'UTF8'),'sha256'),'hex'),'email' from auth.users where email is not null and length(trim(email))>0
on conflict(user_id,contact_hash) do update set contact_type=excluded.contact_type;
insert into public.member_registered_contact_hashes(user_id,contact_hash,contact_type)
select id,encode(extensions.digest(convert_to(trim(phone),'UTF8'),'sha256'),'hex'),'phone' from auth.users where phone is not null and phone_confirmed_at is not null and length(trim(phone))>=8
on conflict(user_id,contact_hash) do update set contact_type=excluded.contact_type;