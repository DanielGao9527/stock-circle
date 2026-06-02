alter table public.posts
  add column if not exists deleted_at timestamptz,
  add column if not exists status text default 'published',
  add column if not exists visibility text default 'group';

alter table public.posts alter column status set default 'published';
alter table public.posts alter column visibility set default 'group';

update public.posts
set status = 'published'
where status is null;

update public.posts
set visibility = 'group'
where visibility is null;

update public.posts
set deleted_at = coalesce(deleted_at, updated_at, now()),
    status = 'hidden'
where is_deleted = true
  and deleted_at is null;

create index if not exists posts_author_active_created_at_idx
on public.posts (author_id, created_at desc)
where deleted_at is null and status <> 'hidden';

drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts"
on public.posts for select
to authenticated
using (
  deleted_at is null
  and status <> 'hidden'
);

drop policy if exists "Authors can create posts" on public.posts;
create policy "Authors can create posts"
on public.posts for insert
to authenticated
with check (
  auth.uid() = author_id
  and deleted_at is null
  and status <> 'hidden'
);

drop policy if exists "Authors can update own posts" on public.posts;
create policy "Authors can update own posts"
on public.posts for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Authors can delete post stock relations" on public.post_stocks;
create policy "Authors can delete post stock relations"
on public.post_stocks for delete
to authenticated
using (
  exists (
    select 1
    from public.posts
    where posts.id = post_stocks.post_id
      and posts.author_id = auth.uid()
  )
);
