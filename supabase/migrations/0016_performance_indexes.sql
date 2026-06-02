create index if not exists posts_active_created_at_idx
on public.posts (created_at desc)
where deleted_at is null and status <> 'hidden';

create index if not exists portfolio_snapshots_active_created_at_idx
on public.portfolio_snapshots (created_at desc)
where deleted_at is null and status <> 'hidden';

create index if not exists post_stocks_post_id_idx
on public.post_stocks (post_id);
