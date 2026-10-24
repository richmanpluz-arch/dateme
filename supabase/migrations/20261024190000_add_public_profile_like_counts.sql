create or replace function public.get_profile_like_counts(p_profile_ids uuid[])
returns table(profile_id uuid, like_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id as profile_id, count(l.user_id)::bigint as like_count
  from public.profiles p
  left join public.likes l on l.liked_user_id = p.id
  where p.id = any(coalesce(p_profile_ids, '{}'::uuid[]))
    and cardinality(coalesce(p_profile_ids, '{}'::uuid[])) <= 100
  group by p.id;
$$;

revoke all on function public.get_profile_like_counts(uuid[]) from public;
grant execute on function public.get_profile_like_counts(uuid[]) to anon, authenticated;
