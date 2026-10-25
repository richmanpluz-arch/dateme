create table if not exists public.member_call_signals (
 id uuid primary key default gen_random_uuid(),
 match_id uuid not null references public.matches(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 signal_type text not null check(signal_type in ('offer','answer','ice','hangup','decline')),
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 check(sender_id<>recipient_id)
);
alter table public.member_call_signals enable row level security;
drop policy if exists call_signals_read_participants on public.member_call_signals;
create policy call_signals_read_participants on public.member_call_signals for select to authenticated using (
 auth.uid() in (sender_id,recipient_id) and exists(select 1 from public.matches m where m.id=match_id and auth.uid() in (m.user_one,m.user_two))
);
drop policy if exists call_signals_insert_sender on public.member_call_signals;
create policy call_signals_insert_sender on public.member_call_signals for insert to authenticated with check (
 sender_id=auth.uid() and exists(select 1 from public.matches m where m.id=match_id and auth.uid() in (m.user_one,m.user_two) and recipient_id in (m.user_one,m.user_two))
);
drop policy if exists call_signals_delete_participant on public.member_call_signals;
create policy call_signals_delete_participant on public.member_call_signals for delete to authenticated using(auth.uid() in (sender_id,recipient_id));
