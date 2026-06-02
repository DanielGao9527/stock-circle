alter table public.portfolio_items
  add column if not exists option_side text,
  add column if not exists contract_count numeric(20, 6),
  add column if not exists premium numeric(20, 6),
  add column if not exists margin_note text,
  add column if not exists risk_note text;

alter table public.portfolio_items
  drop constraint if exists portfolio_items_option_side_check;

alter table public.portfolio_items
  add constraint portfolio_items_option_side_check
  check (
    option_side is null
    or option_side in ('buy', 'sell', 'long', 'short')
  );

alter table public.portfolio_items
  drop constraint if exists portfolio_items_option_number_fields_check;

alter table public.portfolio_items
  add constraint portfolio_items_option_number_fields_check
  check (
    (contract_count is null or contract_count >= 0)
    and (premium is null or premium >= 0)
  );

alter table public.portfolio_items
  drop constraint if exists portfolio_items_option_fields_check;

alter table public.portfolio_items
  add constraint portfolio_items_option_fields_check
  check (
    asset_type <> 'option'
    or (
      underlying_symbol is not null
      and length(trim(underlying_symbol)) > 0
      and option_type is not null
      and strike_price is not null
      and strike_price >= 0
      and expiration_date is not null
    )
  );

create index if not exists portfolio_items_option_side_idx
on public.portfolio_items (option_side)
where asset_type = 'option';
