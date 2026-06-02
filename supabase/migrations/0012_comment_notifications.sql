create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  target_type text not null,
  target_id uuid not null,
  comment_id uuid null references public.comments(id) on delete set null,
  summary text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists actor_id uuid references auth.users(id) on delete cascade,
  add column if not exists notification_type text,
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists comment_id uuid references public.comments(id) on delete set null,
  add column if not exists summary text,
  add column if not exists read_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table public.notifications alter column created_at set default now();

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in ('comment_reply'));

alter table public.notifications
  drop constraint if exists notifications_target_type_check;

alter table public.notifications
  add constraint notifications_target_type_check
  check (target_type in ('post', 'snapshot'));

create index if not exists notifications_recipient_created_at_idx
on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
on public.notifications (recipient_id, created_at desc)
where read_at is null;

create index if not exists notifications_comment_id_idx
on public.notifications (comment_id)
where comment_id is not null;

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications for select
to authenticated
using (auth.uid() = recipient_id);

drop policy if exists "Users can create comment notifications as actor" on public.notifications;
create policy "Users can create comment notifications as actor"
on public.notifications for insert
to authenticated
with check (
  auth.uid() = actor_id
  and recipient_id <> auth.uid()
  and notification_type = 'comment_reply'
  and target_type in ('post', 'snapshot')
);

drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read"
on public.notifications for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);
