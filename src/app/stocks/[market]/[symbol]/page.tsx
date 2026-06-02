import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { actionTypeLabels, formatPositionChange } from "@/lib/portfolio/position-change";
import { postTypeLabels, type PostType } from "@/lib/posts/types";
import { createClient } from "@/lib/supabase/server";

type StockRow = {
  id: string;
  symbol: string;
  market: string;
  name: string | null;
};

type PostRelationRow = {
  post_id: string;
};

type PostRow = {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  post_type: PostType;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
};

type SnapshotRow = {
  id: string;
  owner_id: string | null;
  created_by: string | null;
  title: string | null;
  snapshot_date: string | null;
  created_at: string;
};

type SnapshotItemRow = {
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

type StockDetailPageProps = {
  params: Promise<{
    market: string;
    symbol: string;
  }>;
};

function decodeParam(value: string) {
  return decodeURIComponent(value).trim().toUpperCase();
}

function getPreview(content: string) {
  return content.length > 90 ? `${content.slice(0, 90)}...` : content;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return "未记录日期";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getUserId(snapshot: SnapshotRow) {
  return snapshot.owner_id ?? snapshot.created_by;
}

function isCurrentHolding(positionPercent: number | string) {
  return Number(positionPercent) > 0;
}

async function getProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id,display_name")
    .in("id", userIds);

  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.display_name]));
}

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { market: rawMarket, symbol: rawSymbol } = await params;
  const market = decodeParam(rawMarket);
  const symbol = decodeParam(rawSymbol);

  await requireUser(`/stocks/${market}/${symbol}`);

  const supabase = await createClient();
  const { data: stockData } = await supabase
    .from("stocks")
    .select("id,symbol,market,name")
    .eq("symbol", symbol)
    .eq("market", market)
    .maybeSingle();

  const stock = stockData as StockRow | null;
  let posts: PostRow[] = [];

  if (stock) {
    const { data: relationData } = await supabase
      .from("post_stocks")
      .select("post_id")
      .eq("stock_id", stock.id);
    const postIds = ((relationData ?? []) as PostRelationRow[]).map((relation) => relation.post_id);

    if (postIds.length > 0) {
      const { data: postData } = await supabase
        .from("posts")
        .select("id,author_id,title,content,post_type,created_at")
        .in("id", postIds)
        .is("deleted_at", null)
        .neq("status", "hidden")
        .order("created_at", { ascending: false });

      posts = (postData ?? []) as PostRow[];
    }
  }

  const { data: snapshotData } = await supabase
    .from("portfolio_snapshots")
    .select("id,owner_id,created_by,title,snapshot_date,created_at")
    .is("deleted_at", null)
    .neq("status", "hidden")
    .order("created_at", { ascending: false })
    .limit(200);
  const snapshots = (snapshotData ?? []) as SnapshotRow[];
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  const latestSnapshotByUser = new Map<string, SnapshotRow>();

  snapshots.forEach((snapshot) => {
    const userId = getUserId(snapshot);
    if (userId && !latestSnapshotByUser.has(userId)) {
      latestSnapshotByUser.set(userId, snapshot);
    }
  });

  const { data: itemData } = await supabase
    .from("portfolio_items")
    .select(
      "id,snapshot_id,symbol,market,previous_percent,position_percent,action_type,change_reason,cost_price,reference_price,currency,note,created_at",
    )
    .eq("symbol", symbol)
    .order("created_at", { ascending: false })
    .limit(100);
  const relatedItems = ((itemData ?? []) as SnapshotItemRow[]).filter(
    (item) => (item.market ?? "US").toUpperCase() === market && snapshotById.has(item.snapshot_id),
  );

  const latestSnapshotIds = new Set(
    Array.from(latestSnapshotByUser.values()).map((snapshot) => snapshot.id),
  );
  const holderEntriesByUser = relatedItems.reduce(
    (map, item) => {
      if (!latestSnapshotIds.has(item.snapshot_id) || !isCurrentHolding(item.position_percent)) {
        return map;
      }

      const snapshot = snapshotById.get(item.snapshot_id);
      const userId = snapshot ? getUserId(snapshot) : null;

      if (userId && snapshot && !map.has(userId)) {
        map.set(userId, { item, snapshot });
      }

      return map;
    },
    new Map<string, { item: SnapshotItemRow; snapshot: SnapshotRow }>(),
  );
  const holderEntries = Array.from(holderEntriesByUser.entries()).map(
    ([userId, { item, snapshot }]) => ({
      userId,
      item,
      snapshot,
    }),
  );
  const userIds = Array.from(
    new Set([
      ...posts.map((post) => post.author_id),
      ...holderEntries.map((entry) => entry.userId),
    ] as string[]),
  );
  const profiles = await getProfiles(supabase, userIds);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{symbol}</h1>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">{market}</span>
        </div>
        <p className="mt-2 text-sm text-zinc-600">{stock?.name ?? "暂无股票名称"}</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">相关帖子</h2>
        {posts.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">还没有关联帖子。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="block rounded-xl border border-zinc-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>{profiles.get(post.author_id) ?? `成员 ${post.author_id.slice(0, 8)}`}</span>
                  <span>·</span>
                  <span>{formatTime(post.created_at)}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                    {postTypeLabels[post.post_type]}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-medium text-zinc-900">
                  {post.title ?? getPreview(post.content)}
                </h3>
                {post.title ? (
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{getPreview(post.content)}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">最新持有人</h2>
        {holderEntries.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">最新持仓快照中暂未看到该股票。</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {holderEntries.map(({ userId, item, snapshot }) => (
              <div key={userId} className="rounded-xl border border-zinc-200 p-4">
                <div className="text-sm font-medium">
                  {profiles.get(userId) ?? `成员 ${userId.slice(0, 8)}`}
                </div>
                <div className="mt-2 text-sm text-zinc-600">
                  仓位：{formatPositionChange(item.previous_percent, item.position_percent)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {snapshot.title ?? "未命名持仓快照"} · {formatDate(snapshot.snapshot_date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">相关持仓明细</h2>
        {relatedItems.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">还没有相关持仓明细。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {relatedItems.map((item) => {
              const snapshot = snapshotById.get(item.snapshot_id);

              return (
                <div key={item.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{snapshot?.title ?? "未命名持仓快照"}</div>
                    <div className="text-xs text-zinc-500">
                      {formatDate(snapshot?.snapshot_date ?? null)}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-zinc-500">仓位变化</div>
                      <div className="mt-1 text-zinc-900">
                        {formatPositionChange(item.previous_percent, item.position_percent)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-zinc-500">成本价</div>
                      <div className="mt-1 text-zinc-900">{item.cost_price ?? "未填写"}</div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-zinc-500">参考价格</div>
                      <div className="mt-1 text-zinc-900">
                        {item.reference_price
                          ? `${item.reference_price} ${item.currency ?? ""}`
                          : "未填写"}
                      </div>
                    </div>
                  </div>
                  {item.action_type ? (
                    <div className="mt-3 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {actionTypeLabels[item.action_type] ?? item.action_type}
                    </div>
                  ) : null}
                  {item.note ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-600">{item.note}</p>
                  ) : null}
                  {item.change_reason ? (
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      变化原因：{item.change_reason}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
