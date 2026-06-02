create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  title text null,
  notes text null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.snapshot_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.portfolio_snapshots(id) on delete cascade,
  ticker text not null,
  quantity numeric(20, 6) null,
  avg_cost numeric(20, 6) null,
  ref_price numeric(20, 6) null,
  currency text not null default 'USD',
  item_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.portfolio_snapshots
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete cascade,
  add column if not exists snapshot_date date default current_date,
  add column if not exists title text,
  add column if not exists notes text,
  add column if not exists is_deleted boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.snapshot_items
  add column if not exists ticker text,
  add column if not exists quantity numeric(20, 6),
  add column if not exists avg_cost numeric(20, 6),
  add column if not exists ref_price numeric(20, 6),
  add column if not exists currency text default 'USD',
  add column if not exists item_note text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.profiles alter column is_active set default true;
alter table public.profiles alter column created_at set default now();
alter table public.profiles alter column updated_at set default now();
alter table public.portfolio_snapshots alter column snapshot_date set default current_date;
alter table public.portfolio_snapshots alter column is_deleted set default false;
alter table public.portfolio_snapshots alter column created_at set default now();
alter table public.portfolio_snapshots alter column updated_at set default now();
alter table public.snapshot_items alter column currency set default 'USD';
alter table public.snapshot_items alter column created_at set default now();
alter table public.snapshot_items alter column updated_at set default now();

update public.profiles set is_active = true where is_active is null;
update public.portfolio_snapshots set is_deleted = false where is_deleted is null;
update public.snapshot_items set currency = 'USD' where currency is null;

create index if not exists portfolio_snapshots_created_at_idx
on public.portfolio_snapshots (created_at desc);

create index if not exists portfolio_snapshots_owner_created_at_idx
on public.portfolio_snapshots (owner_id, created_at desc);

create index if not exists snapshot_items_snapshot_id_idx
on public.snapshot_items (snapshot_id);

alter table public.profiles enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.snapshot_items enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Authenticated users can read portfolio snapshots" on public.portfolio_snapshots;
create policy "Authenticated users can read portfolio snapshots"
on public.portfolio_snapshots for select
to authenticated
using (is_deleted = false);

drop policy if exists "Users can create own portfolio snapshots" on public.portfolio_snapshots;
create policy "Users can create own portfolio snapshots"
on public.portfolio_snapshots for insert
to authenticated
with check (auth.uid() = owner_id and auth.uid() = created_by);

drop policy if exists "Users can update own portfolio snapshots" on public.portfolio_snapshots;
create policy "Users can update own portfolio snapshots"
on public.portfolio_snapshots for update
to authenticated
using (auth.uid() = owner_id or auth.uid() = created_by)
with check (auth.uid() = owner_id or auth.uid() = created_by);

drop policy if exists "Authenticated users can read snapshot items" on public.snapshot_items;
create policy "Authenticated users can read snapshot items"
on public.snapshot_items for select
to authenticated
using (
  exists (
    select 1
    from public.portfolio_snapshots
    where portfolio_snapshots.id = snapshot_items.snapshot_id
      and portfolio_snapshots.is_deleted = false
  )
);

drop policy if exists "Users can create snapshot items for own snapshots" on public.snapshot_items;
create policy "Users can create snapshot items for own snapshots"
on public.snapshot_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.portfolio_snapshots
    where portfolio_snapshots.id = snapshot_items.snapshot_id
      and (
        portfolio_snapshots.owner_id = auth.uid()
        or portfolio_snapshots.created_by = auth.uid()
      )
  )
);
