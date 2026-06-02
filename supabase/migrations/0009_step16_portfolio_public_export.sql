alter table public.portfolio_snapshots
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete cascade,
  add column if not exists snapshot_date date default current_date,
  add column if not exists deleted_at timestamptz,
  add column if not exists status text default 'published';

alter table public.portfolio_items
  add column if not exists previous_percent numeric(8, 4),
  add column if not exists action_type text,
  add column if not exists change_reason text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'portfolio_snapshots'
      and column_name = 'user_id'
  ) then
    execute '
      update public.portfolio_snapshots
      set owner_id = coalesce(owner_id, user_id),
          created_by = coalesce(created_by, user_id)
      where owner_id is null
         or created_by is null
    ';

    execute 'alter table public.portfolio_snapshots alter column user_id drop not null';
  end if;
end $$;

update public.portfolio_snapshots
set owner_id = created_by
where owner_id is null
  and created_by is not null;

update public.portfolio_snapshots
set created_by = owner_id
where created_by is null
  and owner_id is not null;

update public.portfolio_snapshots
set snapshot_date = coalesce(snapshot_date, created_at::date, current_date)
where snapshot_date is null;

update public.portfolio_snapshots
set status = 'published'
where status is null;

update public.portfolio_snapshots
set deleted_at = coalesce(deleted_at, updated_at, now()),
    status = 'hidden'
where is_deleted = true
  and deleted_at is null;

alter table public.portfolio_snapshots alter column snapshot_date set default current_date;
alter table public.portfolio_snapshots alter column status set default 'published';

create index if not exists portfolio_snapshots_owner_active_created_at_idx
on public.portfolio_snapshots (owner_id, created_at desc)
where deleted_at is null and status <> 'hidden';

create index if not exists portfolio_items_action_type_idx
on public.portfolio_items (action_type);

drop policy if exists "Authenticated users can read portfolio snapshots" on public.portfolio_snapshots;
create policy "Authenticated users can read portfolio snapshots"
on public.portfolio_snapshots for select
to authenticated
using (
  deleted_at is null
  and status <> 'hidden'
);

drop policy if exists "Users can create own portfolio snapshots" on public.portfolio_snapshots;
create policy "Users can create own portfolio snapshots"
on public.portfolio_snapshots for insert
to authenticated
with check (
  auth.uid() = owner_id
  and auth.uid() = created_by
  and deleted_at is null
  and status <> 'hidden'
);

drop policy if exists "Users can update own portfolio snapshots" on public.portfolio_snapshots;
create policy "Users can update own portfolio snapshots"
on public.portfolio_snapshots for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Authenticated users can read portfolio items" on public.portfolio_items;
create policy "Authenticated users can read portfolio items"
on public.portfolio_items for select
to authenticated
using (
  exists (
    select 1
    from public.portfolio_snapshots
    where portfolio_snapshots.id = portfolio_items.snapshot_id
      and portfolio_snapshots.deleted_at is null
      and portfolio_snapshots.status <> 'hidden'
  )
);

drop policy if exists "Users can delete portfolio items for own snapshots" on public.portfolio_items;
create policy "Users can delete portfolio items for own snapshots"
on public.portfolio_items for delete
to authenticated
using (
  exists (
    select 1
    from public.portfolio_snapshots
    where portfolio_snapshots.id = portfolio_items.snapshot_id
      and portfolio_snapshots.owner_id = auth.uid()
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
      and portfolio_snapshots.owner_id = auth.uid()
      and portfolio_snapshots.deleted_at is null
      and portfolio_snapshots.status <> 'hidden'
  )
);
