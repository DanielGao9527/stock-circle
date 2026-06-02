alter table public.portfolio_items
  add column if not exists previous_percent numeric(8, 4),
  add column if not exists action_type text,
  add column if not exists change_reason text;

create index if not exists portfolio_items_action_type_idx
on public.portfolio_items (action_type);
