import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getCommentCountsForTargets } from "@/lib/comments/data";
import {
  getLatestActiveSnapshotsForUsers,
  type PortfolioSnapshotRow,
} from "@/lib/portfolio/data";
import { actionTypeLabels, formatPositionChange } from "@/lib/portfolio/position-change";
import { postTypeLabels, type PostType } from "@/lib/posts/types";
import { createClient } from "@/lib/supabase/server";

type StockRow = {
  id: string;
  symbol: string;
  market: string;
  name: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string;
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

type SnapshotRow = PortfolioSnapshotRow;

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

type ProfileIdRow = {
  id: string;
};

type StockDetailPageProps = {
  params: Promise<{
    market: string;
    symbol: string;
  }>;
};

const POST_LIMIT = 20;
const ITEM_HISTORY_LIMIT = 50;

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

  const { data } = await supabase.from("profiles").select("id,display_name").in("id", userIds);

  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.display_name]));
}

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { market: rawMarket, symbol: rawSymbol } = await params;
  const market = decodeParam(rawMarket);
  const symbol = decodeParam(rawSymbol);

  await requireUser(`/stocks/${market}/${symbol}`);

  const supabase = await createClient();
  const [{ data: stockData }, { data: profileData }] = await Promise.all([
    supabase
      .from("stocks")
      .select("id,symbol,market,name")
      .eq("symbol", symbol)
      .eq("market", market)
      .maybeSingle(),
    supabase.from("profiles").select("id").eq("is_active", true),
  ]);

  const stock = stockData as StockRow | null;
  const profileIds = ((profileData ?? []) as ProfileIdRow[]).map((profile) => profile.id);
  const latestSnapshots = await getLatestActiveSnapshotsForUsers(supabase, profileIds);
  const latestSnapshotIds = latestSnapshots.map((snapshot) => snapshot.id);
  const latestSnapshotsById = new Map(latestSnapshots.map((snapshot) => [snapshot.id, snapshot]));

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
        .order("created_at", { ascending: false })
        .limit(POST_LIMIT);

      posts = (postData ?? []) as PostRow[];
    }
  }

  const [{ data: latestItemData }, { data: historyItemData }] = await Promise.all([
    latestSnapshotIds.length > 0
      ? supabase
          .from("portfolio_items")
          .select(
            "id,snapshot_id,symbol,market,previous_percent,position_percent,action_type,change_reason,cost_price,reference_price,currency,note,created_at",
          )
          .in("snapshot_id", latestSnapshotIds)
          .eq("symbol", symbol)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("portfolio_items")
      .select(
        "id,snapshot_id,symbol,market,previous_percent,position_percent,action_type,change_reason,cost_price,reference_price,currency,note,created_at",
      )
      .eq("symbol", symbol)
      .order("created_at", { ascending: false })
      .limit(ITEM_HISTORY_LIMIT),
  ]);

  const latestHolderItems = ((latestItemData ?? []) as SnapshotItemRow[]).filter(
    (item) => (item.market ?? "US").toUpperCase() === market,
  );
  const historyItems = ((historyItemData ?? []) as SnapshotItemRow[]).filter(
    (item) => (item.market ?? "US").toUpperCase() === market,
  );

  const historySnapshotIds = Array.from(new Set(historyItems.map((item) => item.snapshot_id)));
  const missingSnapshotIds = historySnapshotIds.filter((snapshotId) => !latestSnapshotsById.has(snapshotId));
  const { data: historySnapshotData } = missingSnapshotIds.length
    ? await supabase
        .from("portfolio_snapshots")
        .select("id,owner_id,created_by,title,snapshot_date,created_at")
        .in("id", missingSnapshotIds)
        .is("deleted_at", null)
        .neq("status", "hidden")
    : { data: [] };

  const snapshotById = new Map<string, SnapshotRow>(latestSnapshotsById);

  ((historySnapshotData ?? []) as SnapshotRow[]).forEach((snapshot) => {
    snapshotById.set(snapshot.id, snapshot);
  });

  const relatedItems = historyItems.filter((item) => snapshotById.has(item.snapshot_id));
  const holderEntriesByUser = latestHolderItems.reduce(
    (map, item) => {
      const snapshot = latestSnapshotsById.get(item.snapshot_id);
      const userId = snapshot ? getUserId(snapshot) : null;

      if (userId && snapshot && isCurrentHolding(item.position_percent) && !map.has(userId)) {
        map.set(userId, { item, snapshot });
      }

      return map;
    },
    new Map<string, { item: SnapshotItemRow; snapshot: SnapshotRow }>(),
  );

  const holderEntries = Array.from(holderEntriesByUser.entries()).map(([userId, value]) => ({
    userId,
    item: value.item,
    snapshot: value.snapshot,
  }));
  const userIds = Array.from(
    new Set([...posts.map((post) => post.author_id), ...holderEntries.map((entry) => entry.userId)]),
  );
  const [profiles, commentCountsByPost] = await Promise.all([
    getProfiles(supabase, userIds),
    getCommentCountsForTargets(
      supabase,
      "post",
      posts.map((post) => post.id),
    ),
  ]);

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
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                    评论 {commentCountsByPost.get(post.id) ?? 0}
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
          <p className="mt-3 text-sm text-zinc-600">最新持仓快照中暂未看到这只股票。</p>
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
                      <div className="text-zinc-500">现价</div>
                      <div className="mt-1 text-zinc-900">
                        {item.reference_price ? `${item.reference_price} ${item.currency ?? ""}` : "未填写"}
                      </div>
                    </div>
                  </div>
                  {item.action_type ? (
                    <div className="mt-3 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {actionTypeLabels[item.action_type] ?? item.action_type}
                    </div>
                  ) : null}
                  {item.note ? <p className="mt-3 text-sm leading-6 text-zinc-600">{item.note}</p> : null}
                  {item.change_reason ? (
                    <p className="mt-2 text-sm leading-6 text-zinc-600">变化原因：{item.change_reason}</p>
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
