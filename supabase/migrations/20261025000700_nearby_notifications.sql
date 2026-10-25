create or replace function public.notify_opted_in_nearby_members()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.share_nearby is distinct from true or new.latitude is null or new.longitude is null then return new; end if;
 if tg_op='UPDATE' and old.share_nearby=true and old.latitude is not distinct from new.latitude and old.longitude is not distinct from new.longitude then return new; end if;
 insert into public.member_notifications(user_id,actor_id,kind,title,body,entity_id)
 select prefs.user_id,null,'nearby','Someone nearby is active','A member opted into nearby discovery within your selected area.',null
 from public.member_location_preferences prefs
 join public.member_notification_preferences settings on settings.user_id=prefs.user_id and settings.nearby_alerts=true
 cross join lateral (select 6371*acos(least(1,greatest(-1,sin(radians(prefs.latitude))*sin(radians(new.latitude))+cos(radians(prefs.latitude))*cos(radians(new.latitude))*cos(radians(new.longitude-prefs.longitude))))) as km) dist
 where prefs.user_id<>new.user_id and prefs.latitude is not null and prefs.longitude is not null
 and dist.km<=settings.nearby_radius_km
 and not exists(select 1 from public.member_notifications n where n.user_id=prefs.user_id and n.kind='nearby' and n.created_at>now()-interval '24 hours');
 return new;
end $$;
revoke execute on function public.notify_opted_in_nearby_members() from anon, authenticated, public;
drop trigger if exists notify_opted_in_nearby_members_trigger on public.member_location_preferences;
create trigger notify_opted_in_nearby_members_trigger after insert or update of latitude,longitude,share_nearby on public.member_location_preferences for each row execute function public.notify_opted_in_nearby_members();