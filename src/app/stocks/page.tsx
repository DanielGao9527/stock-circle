import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

type StockRow = {
  id: string;
  symbol: string;
  market: string;
  name: string | null;
};

type PostRelationRow = {
  stock_id: string;
  post_id: string;
};

type PostRow = {
  id: string;
};

type SnapshotRow = {
  id: string;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
};

type SnapshotItemRow = {
  snapshot_id: string;
  symbol: string;
  market: string | null;
};

type StockCard = {
  symbol: string;
  market: string;
  name: string | null;
  postCount: number;
  holderCount: number;
};

function stockKey(market: string, symbol: string) {
  return `${market.toUpperCase()}::${symbol.toUpperCase()}`;
}

function stockHref(market: string, symbol: string) {
  return `/stocks/${encodeURIComponent(market.toUpperCase())}/${encodeURIComponent(symbol.toUpperCase())}`;
}

export default async function StocksPage() {
  await requireUser("/stocks");
  const supabase = await createClient();

  const { data: stockData, error: stockError } = await supabase
    .from("stocks")
    .select("id,symbol,market,name")
    .order("symbol");

  if (stockError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        股票列表加载失败：{stockError.message}
      </section>
    );
  }

  const stocks = (stockData ?? []) as StockRow[];
  const stockById = new Map(stocks.map((stock) => [stock.id, stock]));

  const { data: postData } = await supabase.from("posts").select("id").eq("is_deleted", false);
  const activePostIds = new Set(((postData ?? []) as PostRow[]).map((post) => post.id));

  const { data: relationData } = await supabase
    .from("post_stocks")
    .select("stock_id,post_id");
  const postRelations = (relationData ?? []) as PostRelationRow[];

  const postCounts = postRelations.reduce((map, relation) => {
    if (!activePostIds.has(relation.post_id)) {
      return map;
    }

    const stock = stockById.get(relation.stock_id);
    if (!stock) {
      return map;
    }

    const key = stockKey(stock.market, stock.symbol);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const { data: snapshotData } = await supabase
    .from("portfolio_snapshots")
    .select("id,owner_id,created_by,created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(200);
  const snapshots = (snapshotData ?? []) as SnapshotRow[];
  const latestSnapshotByUser = new Map<string, SnapshotRow>();

  snapshots.forEach((snapshot) => {
    const userId = snapshot.owner_id ?? snapshot.created_by;
    if (userId && !latestSnapshotByUser.has(userId)) {
      latestSnapshotByUser.set(userId, snapshot);
    }
  });

  const latestSnapshotIds = Array.from(latestSnapshotByUser.values()).map((snapshot) => snapshot.id);
  const snapshotIds = snapshots.map((snapshot) => snapshot.id);
  let allSnapshotItems: SnapshotItemRow[] = [];

  if (snapshotIds.length > 0) {
    const { data: itemData } = await supabase
      .from("portfolio_items")
      .select("snapshot_id,symbol,market")
      .in("snapshot_id", snapshotIds)
      .limit(500);

    allSnapshotItems = (itemData ?? []) as SnapshotItemRow[];
  }

  const latestSnapshotIdSet = new Set(latestSnapshotIds);
  const latestSnapshotItems = allSnapshotItems.filter((item) =>
    latestSnapshotIdSet.has(item.snapshot_id),
  );

  const holderCounts = latestSnapshotItems.reduce((map, item) => {
    const snapshot = snapshots.find((candidate) => candidate.id === item.snapshot_id);
    const userId = snapshot?.owner_id ?? snapshot?.created_by;

    if (!userId) {
      return map;
    }

    const key = stockKey(item.market ?? "US", item.symbol);
    const holders = map.get(key) ?? new Set<string>();
    holders.add(userId);
    map.set(key, holders);
    return map;
  }, new Map<string, Set<string>>());

  const cardsByKey = new Map<string, StockCard>();

  stocks.forEach((stock) => {
    const key = stockKey(stock.market, stock.symbol);
    const postCount = postCounts.get(key) ?? 0;
    const holderCount = holderCounts.get(key)?.size ?? 0;

    if (postCount > 0 || holderCount > 0) {
      cardsByKey.set(key, {
        symbol: stock.symbol,
        market: stock.market,
        name: stock.name,
        postCount,
        holderCount,
      });
    }
  });

  allSnapshotItems.forEach((item) => {
    const symbol = item.symbol.toUpperCase();
    const market = (item.market ?? "US").toUpperCase();
    const key = stockKey(market, symbol);

    if (!cardsByKey.has(key)) {
      cardsByKey.set(key, {
        symbol,
        market,
        name: null,
        postCount: postCounts.get(key) ?? 0,
        holderCount: holderCounts.get(key)?.size ?? 0,
      });
    }
  });

  const stockCards = Array.from(cardsByKey.values()).sort((a, b) =>
    `${a.market}:${a.symbol}`.localeCompare(`${b.market}:${b.symbol}`),
  );

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">股票</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          汇总已经关联帖子或出现在持仓快照中的股票。
        </p>
      </div>

      {stockCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center">
          <h2 className="text-base font-medium">还没有股票记录</h2>
          <p className="mt-2 text-sm text-zinc-600">发布一条带股票代码的内容后，这里会自动出现。</p>
          <Link
            href="/quick"
            className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            去发布
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {stockCards.map((stock) => (
            <Link
              key={stockKey(stock.market, stock.symbol)}
              href={stockHref(stock.market, stock.symbol)}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">{stock.symbol}</h2>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {stock.market}
                    </span>
                  </div>
                  {stock.name ? (
                    <p className="mt-1 text-sm text-zinc-600">{stock.name}</p>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-400">暂无名称</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-zinc-50 p-3">
                  <div className="text-zinc-500">相关帖子</div>
                  <div className="mt-1 font-semibold text-zinc-900">{stock.postCount}</div>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3">
                  <div className="text-zinc-500">持有人数</div>
                  <div className="mt-1 font-semibold text-zinc-900">{stock.holderCount}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
