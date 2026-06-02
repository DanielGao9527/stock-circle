create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_email_enabled boolean not null default false,
  digest_email text null,
  digest_time text not null default 'us_market_open_minus_10m',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences
  add column if not exists daily_email_enabled boolean not null default false,
  add column if not exists digest_email text,
  add column if not exists digest_time text not null default 'us_market_open_minus_10m',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.notification_preferences alter column daily_email_enabled set default false;
alter table public.notification_preferences alter column digest_time set default 'us_market_open_minus_10m';
alter table public.notification_preferences alter column created_at set default now();
alter table public.notification_preferences alter column updated_at set default now();

alter table public.notification_preferences
  drop constraint if exists notification_preferences_digest_time_check;

alter table public.notification_preferences
  add constraint notification_preferences_digest_time_check
  check (digest_time in ('us_market_open_minus_10m'));

create index if not exists notification_preferences_digest_time_idx
on public.notification_preferences (digest_time, daily_email_enabled);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
create policy "Users can read own notification preferences"
on public.notification_preferences for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notification preferences" on public.notification_preferences;
create policy "Users can insert own notification preferences"
on public.notification_preferences for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
create policy "Users can update own notification preferences"
on public.notification_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
