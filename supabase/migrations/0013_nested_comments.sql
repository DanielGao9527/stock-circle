alter table public.comments
  add column if not exists parent_comment_id uuid null references public.comments(id) on delete set null;

create index if not exists comments_parent_created_at_idx
on public.comments (parent_comment_id, created_at asc);

drop policy if exists "Authenticated users can read comments" on public.comments;
create policy "Authenticated users can read comments"
on public.comments for select
to authenticated
using (
  (
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
  and (
    parent_comment_id is null
    or exists (
      select 1
      from public.comments as parent_comments
      where parent_comments.id = comments.parent_comment_id
        and parent_comments.target_type = comments.target_type
        and parent_comments.target_id = comments.target_id
    )
  )
);
