create table if not exists public.member_plan_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('week','month','three_months','six_months','yearly')),
  preferences text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_code),
  constraint member_plan_preferences_allowed_values check (
    preferences <@ array['text-chat','photo-sharing','voice-calls','video-calls']::text[]
  )
);

alter table public.member_plan_preferences enable row level security;
revoke all on table public.member_plan_preferences from anon, public;
grant select, insert, update, delete on table public.member_plan_preferences to authenticated;

drop policy if exists "Members can read their own plan preferences" on public.member_plan_preferences;
create policy "Members can read their own plan preferences"
  on public.member_plan_preferences for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Members can create their own plan preferences" on public.member_plan_preferences;
create policy "Members can create their own plan preferences"
  on public.member_plan_preferences for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Members can update their own plan preferences" on public.member_plan_preferences;
create policy "Members can update their own plan preferences"
  on public.member_plan_preferences for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Members can delete their own plan preferences" on public.member_plan_preferences;
create policy "Members can delete their own plan preferences"
  on public.member_plan_preferences for delete to authenticated
  using (auth.uid() = user_id);
