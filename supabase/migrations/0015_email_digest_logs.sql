create table if not exists public.email_digest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  digest_date date not null,
  recipient_email text not null,
  status text not null,
  resend_email_id text null,
  error_message text null,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_digest_logs
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists digest_date date,
  add column if not exists recipient_email text,
  add column if not exists status text,
  add column if not exists resend_email_id text,
  add column if not exists error_message text,
  add column if not exists sent_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.email_digest_logs alter column created_at set default now();
alter table public.email_digest_logs alter column updated_at set default now();

alter table public.email_digest_logs
  drop constraint if exists email_digest_logs_status_check;

alter table public.email_digest_logs
  add constraint email_digest_logs_status_check
  check (status in ('sent', 'failed'));

create unique index if not exists email_digest_logs_user_digest_date_idx
on public.email_digest_logs (user_id, digest_date);

create index if not exists email_digest_logs_digest_date_status_idx
on public.email_digest_logs (digest_date, status);

alter table public.email_digest_logs enable row level security;

drop policy if exists "Users can read own email digest logs" on public.email_digest_logs;
create policy "Users can read own email digest logs"
on public.email_digest_logs for select
to authenticated
using (auth.uid() = user_id);
