create or replace function public.get_comment_counts_for_targets(
  p_target_type text,
  p_target_ids uuid[]
)
returns table (
  target_id uuid,
  comment_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    comments.target_id,
    count(*)::bigint as comment_count
  from public.comments
  where comments.target_type = p_target_type
    and comments.target_id = any(p_target_ids)
    and comments.deleted_at is null
    and coalesce(comments.is_deleted, false) = false
  group by comments.target_id;
$$;

revoke all on function public.get_comment_counts_for_targets(text, uuid[]) from public;
grant execute on function public.get_comment_counts_for_targets(text, uuid[]) to authenticated;
