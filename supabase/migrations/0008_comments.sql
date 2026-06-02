create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  content text not null,
  deleted_at timestamptz null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments
  add column if not exists author_id uuid references auth.users(id) on delete cascade,
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists content text,
  add column if not exists deleted_at timestamptz,
  add column if not exists is_deleted boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.comments alter column is_deleted set default false;
alter table public.comments alter column created_at set default now();
alter table public.comments alter column updated_at set default now();

update public.comments
set is_deleted = false
where is_deleted is null;

update public.comments
set deleted_at = coalesce(deleted_at, updated_at, now())
where is_deleted = true
  and deleted_at is null;

create index if not exists comments_target_created_at_idx
on public.comments (target_type, target_id, created_at asc)
where deleted_at is null;

create index if not exists comments_author_created_at_idx
on public.comments (author_id, created_at desc);

alter table public.comments enable row level security;

drop policy if exists "Authenticated users can read comments" on public.comments;
create policy "Authenticated users can read comments"
on public.comments for select
to authenticated
using (
  deleted_at is null
  and (
    (
      target_type = 'post'
      and exists (
        select 1
        from public.posts
        where posts.id = comments.target_id
          and posts.deleted_at is null
          and posts.status <> 'hidden'
      )
    )
    or (
      target_type = 'snapshot'
      and exists (
        select 1
        from public.portfolio_snapshots
        where portfolio_snapshots.id = comments.target_id
          and portfolio_snapshots.deleted_at is null
          and portfolio_snapshots.status <> 'hidden'
      )
    )
  )
);

drop policy if exists "Users can create comments on visible targets" on public.comments;
create policy "Users can create comments on visible targets"
on public.comments for insert
to authenticated
with check (
  auth.uid() = author_id
  and deleted_at is null
  and (
    (
      target_type = 'post'
      and exists (
        select 1
        from public.posts
        where posts.id = comments.target_id
          and posts.deleted_at is null
          and posts.status <> 'hidden'
      )
    )
    or (
      target_type = 'snapshot'
      and exists (
        select 1
        from public.portfolio_snapshots
        where portfolio_snapshots.id = comments.target_id
          and portfolio_snapshots.deleted_at is null
          and portfolio_snapshots.status <> 'hidden'
      )
    )
  )
);

drop policy if exists "Users can update own comments" on public.comments;
create policy "Users can update own comments"
on public.comments for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);
