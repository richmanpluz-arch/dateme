-- Enforce gallery limits in the database, not only in the browser.
create or replace function public.enforce_member_media_limits()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  active_plan text := 'free';
  photo_limit integer := 1;
  video_limit integer := 0;
  current_count integer := 0;
  is_admin boolean := false;
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception 'PROFILE_MEDIA_OWNER_MISMATCH';
  end if;

  select exists(select 1 from public.admin_users a where a.user_id = new.user_id)
    into is_admin;
  if is_admin then
    return new;
  end if;

  select s.plan_code into active_plan
  from public.member_subscriptions s
  where s.user_id = new.user_id
    and s.status = 'active'
    and s.payment_verified = true
    and s.ends_at > now()
  limit 1;

  case coalesce(active_plan, 'free')
    when 'week' then photo_limit := 4; video_limit := 0;
    when 'month' then photo_limit := 8; video_limit := 1;
    when 'three_months' then photo_limit := 15; video_limit := 3;
    when 'six_months' then photo_limit := 25; video_limit := 10;
    when 'yearly' then photo_limit := 50; video_limit := 20;
    else photo_limit := 1; video_limit := 0;
  end case;

  select count(*)::integer into current_count
  from public.member_media m
  where m.user_id = new.user_id and m.media_type = new.media_type;

  if new.media_type = 'photo' and current_count >= photo_limit then
    raise exception 'PROFILE_PHOTO_LIMIT_EXCEEDED:%', photo_limit;
  end if;
  if new.media_type = 'video' and current_count >= video_limit then
    raise exception 'PROFILE_VIDEO_LIMIT_EXCEEDED:%', video_limit;
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_member_media_limits_before_insert on public.member_media;
create trigger enforce_member_media_limits_before_insert
before insert on public.member_media
for each row execute function public.enforce_member_media_limits();
