import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import {
  getLatestActiveSnapshotsForUsers,
} from "@/lib/portfolio/data";
import { createClient } from "@/lib/supabase/server";

type StocksPageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

type ProfileRow = {
  id: string;
};

type PostRelationRow = {
  stock_id: string;
  post_id: string;
};

type PostRow = {
  id: string;
};

type StockRow = {
  id: string;
  symbol: string;
  market: string;
  name: string | null;
};

type SnapshotItemRow = {
  snapshot_id: string;
  symbol: string;
  market: string | null;
  position_percent: number | string | null;
};

type StockCard = {
  symbol: string;
  market: string;
  name: string | null;
  postCount: number;
  holderCount: number;
};

const PAGE_SIZE = 30;

function stockKey(market: string, symbol: string) {
  return `${market.toUpperCase()}::${symbol.toUpperCase()}`;
}

function stockHref(market: string, symbol: string) {
  return `/stocks/${encodeURIComponent(market.toUpperCase())}/${encodeURIComponent(symbol.toUpperCase())}`;
}

function isCurrentHolding(positionPercent: number | string | null) {
  return Number(positionPercent) > 0;
}

function normalizeSearch(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function buildPageHref(page: number, query: string) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/stocks?${queryString}` : "/stocks";
}

export default async function StocksPage({ searchParams }: StocksPageProps) {
  await requireUser("/stocks");
  const { q, page } = await searchParams;
  const query = normalizeSearch(q);
  const currentPage = normalizePage(page);
  const supabase = await createClient();

  const [{ data: profileData }, { data: postData }] = await Promise.all([
    supabase.from("profiles").select("id").eq("is_active", true),
    supabase
      .from("posts")
      .select("id")
      .is("deleted_at", null)
      .neq("status", "hidden"),
  ]);

  const profileIds = ((profileData ?? []) as ProfileRow[]).map((profile) => profile.id);
  const latestSnapshots = await getLatestActiveSnapshotsForUsers(supabase, profileIds);
  const latestSnapshotsById = new Map(latestSnapshots.map((snapshot) => [snapshot.id, snapshot]));

  const activePostIds = ((postData ?? []) as PostRow[]).map((post) => post.id);
  const [relationData, itemData] = await Promise.all([
    activePostIds.length > 0
      ? supabase.from("post_stocks").select("stock_id,post_id").in("post_id", activePostIds)
      : Promise.resolve({ data: [], error: null }),
    latestSnapshots.length > 0
      ? supabase
          .from("portfolio_items")
          .select("snapshot_id,symbol,market,position_percent")
          .in(
            "snapshot_id",
            latestSnapshots.map((snapshot) => snapshot.id),
          )
      : Promise.resolve({ data: [], error: null }),
  ]);

  const postRelations = (relationData.data ?? []) as PostRelationRow[];
  const latestSnapshotItems = ((itemData.data ?? []) as SnapshotItemRow[]).filter((item) =>
    latestSnapshotsById.has(item.snapshot_id),
  );
  const relatedStockIds = Array.from(new Set(postRelations.map((relation) => relation.stock_id)));

  const { data: stockData, error: stockError } = relatedStockIds.length
    ? await supabase.from("stocks").select("id,symbol,market,name").in("id", relatedStockIds)
    : { data: [], error: null };

  if (stockError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        股票列表加载失败：{stockError.message}
      </section>
    );
  }

  const stocks = (stockData ?? []) as StockRow[];
  const stockById = new Map(stocks.map((stock) => [stock.id, stock]));
  const postCounts = postRelations.reduce((map, relation) => {
    const stock = stockById.get(relation.stock_id);

    if (!stock) {
      return map;
    }

    const key = stockKey(stock.market, stock.symbol);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const holderCounts = latestSnapshotItems.reduce((map, item) => {
    const snapshot = latestSnapshotsById.get(item.snapshot_id);
    const userId = snapshot?.owner_id ?? snapshot?.created_by;

    if (!userId || !isCurrentHolding(item.position_percent)) {
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
    cardsByKey.set(key, {
      symbol: stock.symbol,
      market: stock.market,
      name: stock.name,
      postCount: postCounts.get(key) ?? 0,
      holderCount: holderCounts.get(key)?.size ?? 0,
    });
  });

  latestSnapshotItems.forEach((item) => {
    const market = (item.market ?? "US").toUpperCase();
    const symbol = item.symbol.toUpperCase();
    const key = stockKey(market, symbol);
    const currentCard = cardsByKey.get(key);

    if (currentCard) {
      currentCard.holderCount = holderCounts.get(key)?.size ?? currentCard.holderCount;
      return;
    }

    cardsByKey.set(key, {
      symbol,
      market,
      name: null,
      postCount: postCounts.get(key) ?? 0,
      holderCount: holderCounts.get(key)?.size ?? 0,
    });
  });

  const filteredCards = Array.from(cardsByKey.values())
    .filter((stock) => stock.postCount > 0 || stock.holderCount > 0)
    .filter((stock) => {
      if (!query) {
        return true;
      }

      const haystack = `${stock.symbol} ${stock.market} ${stock.name ?? ""}`.toUpperCase();
      return haystack.includes(query.toUpperCase());
    })
    .sort((a, b) => `${a.market}:${a.symbol}`.localeCompare(`${b.market}:${b.symbol}`));

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleCards = filteredCards.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">股票</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          汇总已经关联帖子或出现在成员最新持仓快照里的股票。
        </p>

        <form action="/stocks" className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="搜索股票代码、市场或名称"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            搜索
          </button>
        </form>
      </div>

      {filteredCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center">
          <h2 className="text-base font-medium">{query ? "没有匹配结果" : "还没有股票记录"}</h2>
          <p className="mt-2 text-sm text-zinc-600">
            {query ? "换个代码或名称再试试。" : "发布一条带股票代码的内容后，这里会自动出现。"}
          </p>
          {!query ? (
            <Link
              href="/quick"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              去发布
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
            <span>
              共 {filteredCards.length} 只股票，当前第 {safePage} / {totalPages} 页
            </span>
            {query ? (
              <Link href="/stocks" className="text-blue-700 transition hover:underline">
                清除搜索
              </Link>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {visibleCards.map((stock) => (
              <Link
                key={stockKey(stock.market, stock.symbol)}
                href={stockHref(stock.market, stock.symbol)}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold tracking-tight">{stock.symbol}</h2>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {stock.market}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-zinc-600">
                      {stock.name ?? "暂无名称"}
                    </p>
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

          <div className="flex items-center justify-between gap-3">
            {safePage > 1 ? (
              <Link
                href={buildPageHref(safePage - 1, query)}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50"
              >
                上一页
              </Link>
            ) : (
              <span />
            )}

            {safePage < totalPages ? (
              <Link
                href={buildPageHref(safePage + 1, query)}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50"
              >
                下一页
              </Link>
            ) : (
              <span />
            )}
          </div>
        </>
      )}
    </section>
  );
}
