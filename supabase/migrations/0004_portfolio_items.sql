create extension if not exists pgcrypto;

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.portfolio_snapshots(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete restrict,
  symbol text not null,
  market text not null default 'US',
  position_percent numeric(8, 4) not null,
  cost_price numeric(20, 6) null,
  reference_price numeric(20, 6) null,
  currency text not null default 'USD',
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(symbol)) > 0),
  check (length(trim(market)) > 0),
  check (position_percent >= 0),
  check (cost_price is null or cost_price >= 0),
  check (reference_price is null or reference_price >= 0),
  check (length(trim(currency)) > 0)
);

alter table public.portfolio_items
  add column if not exists snapshot_id uuid references public.portfolio_snapshots(id) on delete cascade,
  add column if not exists stock_id uuid references public.stocks(id) on delete restrict,
  add column if not exists symbol text,
  add column if not exists market text default 'US',
  add column if not exists position_percent numeric(8, 4),
  add column if not exists cost_price numeric(20, 6),
  add column if not exists reference_price numeric(20, 6),
  add column if not exists currency text default 'USD',
  add column if not exists note text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.portfolio_items alter column market set default 'US';
alter table public.portfolio_items alter column currency set default 'USD';
alter table public.portfolio_items alter column created_at set default now();
alter table public.portfolio_items alter column updated_at set default now();

update public.portfolio_items set market = 'US' where market is null;
update public.portfolio_items set currency = 'USD' where currency is null;

create index if not exists portfolio_items_snapshot_id_idx
on public.portfolio_items (snapshot_id);

create index if not exists portfolio_items_symbol_market_idx
on public.portfolio_items (symbol, market);

create index if not exists portfolio_items_stock_id_idx
on public.portfolio_items (stock_id);

alter table public.portfolio_items enable row level security;

drop policy if exists "Authenticated users can read portfolio items" on public.portfolio_items;
create policy "Authenticated users can read portfolio items"
on public.portfolio_items for select
to authenticated
using (
  exists (
    select 1
    from public.portfolio_snapshots
    where portfolio_snapshots.id = portfolio_items.snapshot_id
      and portfolio_snapshots.is_deleted = false
  )
);

drop policy if exists "Users can create portfolio items for own snapshots" on public.portfolio_items;
create policy "Users can create portfolio items for own snapshots"
on public.portfolio_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.portfolio_snapshots
    where portfolio_snapshots.id = portfolio_items.snapshot_id
      and (
        portfolio_snapshots.owner_id = auth.uid()
        or portfolio_snapshots.created_by = auth.uid()
      )
  )
);
