alter table public.member_location_preferences add column if not exists latitude double precision;
alter table public.member_location_preferences add column if not exists longitude double precision;
alter table public.member_location_preferences add column if not exists share_nearby boolean not null default false;
-- The get_nearby_profiles(uuid-authenticated) RPC is deployed through Supabase migration history and returns profiles only for members who explicitly opted in. Exact coordinates are never returned.