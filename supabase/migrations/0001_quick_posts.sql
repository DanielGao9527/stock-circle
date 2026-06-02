create extension if not exists pgcrypto;

create table if not exists public.stocks (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  market text not null default 'US',
  created_at timestamptz not null default now(),
  unique (symbol, market),
  check (length(trim(symbol)) > 0),
  check (length(trim(market)) > 0)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text null,
  content text not null,
  post_type text not null,
  source_url text null,
  market text not null default 'US',
  reference_price numeric(20, 6) null,
  reference_currency text not null default 'USD',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (post_type in ('idea', 'link', 'news', 'review', 'other')),
  check (reference_price is null or reference_price >= 0),
  check (length(trim(content)) > 0),
  check (length(trim(market)) > 0),
  check (length(trim(reference_currency)) > 0)
);

create table if not exists public.post_stocks (
  post_id uuid not null references public.posts(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, stock_id)
);

alter table public.stocks
  add column if not exists symbol text,
  add column if not exists market text default 'US',
  add column if not exists created_at timestamptz default now();

alter table public.posts
  add column if not exists author_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists content text,
  add column if not exists post_type text,
  add column if not exists source_url text,
  add column if not exists market text default 'US',
  add column if not exists reference_price numeric(20, 6),
  add column if not exists reference_currency text default 'USD',
  add column if not exists is_deleted boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.post_stocks
  add column if not exists created_at timestamptz default now();

alter table public.stocks alter column market set default 'US';
alter table public.posts alter column market set default 'US';
alter table public.posts alter column reference_currency set default 'USD';
alter table public.posts alter column is_deleted set default false;
alter table public.posts alter column created_at set default now();
alter table public.posts alter column updated_at set default now();

update public.posts set is_deleted = false where is_deleted is null;
update public.posts set market = 'US' where market is null;
update public.posts set reference_currency = 'USD' where reference_currency is null;

create index if not exists stocks_symbol_market_idx on public.stocks (symbol, market);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_created_at_idx on public.posts (author_id, created_at desc);
create index if not exists post_stocks_stock_id_idx on public.post_stocks (stock_id);

alter table public.stocks enable row level security;
alter table public.posts enable row level security;
alter table public.post_stocks enable row level security;

drop policy if exists "Authenticated users can read stocks" on public.stocks;
create policy "Authenticated users can read stocks"
on public.stocks for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create stocks" on public.stocks;
create policy "Authenticated users can create stocks"
on public.stocks for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts"
on public.posts for select
to authenticated
using (is_deleted = false);

drop policy if exists "Authors can create posts" on public.posts;
create policy "Authors can create posts"
on public.posts for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Authors can update own posts" on public.posts;
create policy "Authors can update own posts"
on public.posts for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Authenticated users can read post stocks" on public.post_stocks;
create policy "Authenticated users can read post stocks"
on public.post_stocks for select
to authenticated
using (true);

drop policy if exists "Authors can create post stock relations" on public.post_stocks;
create policy "Authors can create post stock relations"
on public.post_stocks for insert
to authenticated
with check (
  exists (
    select 1
    from public.posts
    where posts.id = post_stocks.post_id
      and posts.author_id = auth.uid()
  )
);
