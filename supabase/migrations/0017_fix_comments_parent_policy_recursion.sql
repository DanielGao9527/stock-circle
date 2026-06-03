create or replace function public.is_valid_comment_parent(
  p_parent_comment_id uuid,
  p_target_type text,
  p_target_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_parent_comment_id is null
    or exists (
      select 1
      from public.comments as parent_comments
      where parent_comments.id = p_parent_comment_id
        and parent_comments.target_type = p_target_type
        and parent_comments.target_id = p_target_id
    );
$$;

revoke all on function public.is_valid_comment_parent(uuid, text, uuid) from public;
grant execute on function public.is_valid_comment_parent(uuid, text, uuid) to authenticated;

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
  and public.is_valid_comment_parent(parent_comment_id, target_type, target_id)
);
