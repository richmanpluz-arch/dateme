-- DateMe chat receipts and message deletion controls.
alter table public.messages
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create table if not exists public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id)
);

create table if not exists public.message_hidden_for (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_receipts_user_id_idx on public.message_receipts(user_id);
create index if not exists message_hidden_for_user_id_idx on public.message_hidden_for(user_id);

alter table public.message_receipts enable row level security;
alter table public.message_hidden_for enable row level security;

grant select, insert, update on public.message_receipts to authenticated;
grant select, insert, update, delete on public.message_hidden_for to authenticated;
grant update (body, audio_path, deleted_at, deleted_by) on public.messages to authenticated;

drop policy if exists "Participants can read message receipts" on public.message_receipts;
create policy "Participants can read message receipts" on public.message_receipts
for select to authenticated
using (exists (
  select 1 from public.messages msg join public.matches mt on mt.id = msg.match_id
  where msg.id = message_receipts.message_id
    and auth.uid() in (mt.user_one, mt.user_two)
));

drop policy if exists "Members can record their own delivery receipts" on public.message_receipts;
create policy "Members can record their own delivery receipts" on public.message_receipts
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.messages msg join public.matches mt on mt.id = msg.match_id
    where msg.id = message_receipts.message_id
      and msg.sender_id <> auth.uid()
      and auth.uid() in (mt.user_one, mt.user_two)
  )
);

drop policy if exists "Members can update their own delivery receipts" on public.message_receipts;
create policy "Members can update their own delivery receipts" on public.message_receipts
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Members can hide messages in their own view" on public.message_hidden_for;
create policy "Members can hide messages in their own view" on public.message_hidden_for
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.messages msg join public.matches mt on mt.id = msg.match_id
    where msg.id = message_hidden_for.message_id
      and auth.uid() in (mt.user_one, mt.user_two)
  )
);

drop policy if exists "Senders can delete their messages for everyone" on public.messages;
create policy "Senders can delete their messages for everyone" on public.messages
for update to authenticated
using (
  sender_id = auth.uid()
  and exists (
    select 1 from public.matches mt
    where mt.id = messages.match_id and auth.uid() in (mt.user_one, mt.user_two)
  )
)
with check (
  sender_id = auth.uid()
  and deleted_by = auth.uid()
  and deleted_at is not null
  and body = 'This message was deleted'
);
