drop policy if exists "Members can read their own plan preferences" on public.member_plan_preferences;
create policy "Members can read their own plan preferences"
  on public.member_plan_preferences for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Members can create their own plan preferences" on public.member_plan_preferences;
create policy "Members can create their own plan preferences"
  on public.member_plan_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Members can update their own plan preferences" on public.member_plan_preferences;
create policy "Members can update their own plan preferences"
  on public.member_plan_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Members can delete their own plan preferences" on public.member_plan_preferences;
create policy "Members can delete their own plan preferences"
  on public.member_plan_preferences for delete to authenticated
  using ((select auth.uid()) = user_id);
