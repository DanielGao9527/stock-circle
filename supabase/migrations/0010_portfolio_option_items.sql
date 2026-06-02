alter table public.portfolio_items
  add column if not exists asset_type text not null default 'stock',
  add column if not exists underlying_symbol text,
  add column if not exists option_type text,
  add column if not exists strike_price numeric(20, 6),
  add column if not exists expiration_date date;

update public.portfolio_items
set asset_type = coalesce(asset_type, 'stock')
where asset_type is null;

update public.portfolio_items
set underlying_symbol = coalesce(underlying_symbol, symbol)
where underlying_symbol is null;

alter table public.portfolio_items
  drop constraint if exists portfolio_items_asset_type_check;

alter table public.portfolio_items
  add constraint portfolio_items_asset_type_check
  check (asset_type in ('stock', 'option'));

alter table public.portfolio_items
  drop constraint if exists portfolio_items_option_type_check;

alter table public.portfolio_items
  add constraint portfolio_items_option_type_check
  check (option_type is null or option_type in ('call', 'put'));

alter table public.portfolio_items
  drop constraint if exists portfolio_items_option_fields_check;

alter table public.portfolio_items
  add constraint portfolio_items_option_fields_check
  check (
    asset_type <> 'option'
    or (
      underlying_symbol is not null
      and option_type is not null
      and strike_price is not null
      and strike_price >= 0
      and expiration_date is not null
    )
  );

create index if not exists portfolio_items_asset_type_idx
on public.portfolio_items (asset_type);

create index if not exists portfolio_items_underlying_symbol_idx
on public.portfolio_items (underlying_symbol);
