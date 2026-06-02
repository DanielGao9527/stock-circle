alter table public.stocks
  add column if not exists name text;

alter table public.snapshot_items
  add column if not exists market text default 'US';

alter table public.snapshot_items alter column market set default 'US';
update public.snapshot_items set market = 'US' where market is null;

create index if not exists snapshot_items_ticker_market_idx
on public.snapshot_items (ticker, market);
