import { createClient } from "@/lib/supabase/server";

export type PortfolioSnapshotRow = {
  id: string;
  owner_id: string | null;
  created_by: string | null;
  title: string | null;
  notes: string | null;
  snapshot_date: string | null;
  created_at: string;
};

export type PortfolioItemRow = {
  id: string;
  snapshot_id: string;
  symbol: string;
  market: string | null;
  previous_percent: number | string | null;
  position_percent: number | string;
  action_type: string | null;
  change_reason: string | null;
  cost_price: number | string | null;
  reference_price: number | string | null;
  currency: string | null;
  note: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type SnapshotQueryOptions = {
  ownerId?: string;
  ownerIds?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  ascending?: boolean;
};

export function getSnapshotUserId(snapshot: PortfolioSnapshotRow) {
  return snapshot.owner_id ?? snapshot.created_by;
}

export function getSnapshotTitle(snapshot: PortfolioSnapshotRow) {
  return snapshot.title ?? "未命名持仓快照";
}

export function getSnapshotEffectiveDate(snapshot: PortfolioSnapshotRow) {
  return snapshot.snapshot_date ?? snapshot.created_at.slice(0, 10);
}

export async function getActivePortfolioSnapshots(
  supabase: SupabaseServerClient,
  options: SnapshotQueryOptions = {},
) {
  let query = supabase
    .from("portfolio_snapshots")
    .select("id,owner_id,created_by,title,notes,snapshot_date,created_at")
    .is("deleted_at", null)
    .neq("status", "hidden");

  if (options.ownerId) {
    query = query.eq("owner_id", options.ownerId);
  }

  if (options.ownerIds && options.ownerIds.length > 0) {
    query = query.in("owner_id", options.ownerIds);
  }

  if (options.startDate) {
    query = query.gte("snapshot_date", options.startDate);
  }

  if (options.endDate) {
    query = query.lte("snapshot_date", options.endDate);
  }

  query = query
    .order("created_at", { ascending: options.ascending ?? false })
    .order("snapshot_date", { ascending: options.ascending ?? false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PortfolioSnapshotRow[];
}

export async function getPortfolioItemsForSnapshots(
  supabase: SupabaseServerClient,
  snapshotIds: string[],
) {
  if (snapshotIds.length === 0) {
    return [] as PortfolioItemRow[];
  }

  const { data, error } = await supabase
    .from("portfolio_items")
    .select(
      "id,snapshot_id,symbol,market,previous_percent,position_percent,action_type,change_reason,cost_price,reference_price,currency,note,created_at",
    )
    .in("snapshot_id", snapshotIds)
    .order("position_percent", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PortfolioItemRow[];
}

export async function getPortfolioProfileMap(
  supabase: SupabaseServerClient,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.display_name]));
}

export function groupPortfolioItemsBySnapshot(items: PortfolioItemRow[]) {
  return items.reduce((map, item) => {
    const currentItems = map.get(item.snapshot_id) ?? [];
    map.set(item.snapshot_id, [...currentItems, item]);
    return map;
  }, new Map<string, PortfolioItemRow[]>());
}

export function getLatestSnapshotsByUser(snapshots: PortfolioSnapshotRow[]) {
  return snapshots.reduce((map, snapshot) => {
    const userId = getSnapshotUserId(snapshot);

    if (userId && !map.has(userId)) {
      map.set(userId, snapshot);
    }

    return map;
  }, new Map<string, PortfolioSnapshotRow>());
}
