import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { postTypeLabels, type PostType } from "@/lib/posts/types";
import { ensureProfile } from "@/lib/profiles/ensure-profile";
import { createClient } from "@/lib/supabase/server";

type PostRow = {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  post_type: PostType;
  created_at: string;
};

type SnapshotRow = {
  id: string;
  owner_id: string | null;
  created_by: string | null;
  title: string | null;
  notes: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
};

type PostStockRow = {
  post_id: string;
  stock_id: string;
};

type StockRow = {
  id: string;
  symbol: string;
};

type PortfolioItemRow = {
  snapshot_id: string;
  symbol: string;
  position_percent: number | string;
};

type FeedItem =
  | {
      id: string;
      kind: "post";
      authorId: string;
      authorName: string;
      createdAt: string;
      href: string;
      postType: PostType;
      title: string | null;
      preview: string;
      symbols: string[];
    }
  | {
      id: string;
      kind: "snapshot";
      authorId: string;
      authorName: string;
      createdAt: string;
      href: string;
      title: string;
      items: PortfolioItemRow[];
    };

function getPreview(content: string) {
  return content.length > 90 ? `${content.slice(0, 90)}...` : content;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("Could not find")
  );
}

async function getProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authorIds: string[],
) {
  if (authorIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name")
    .in("id", authorIds);

  if (error) {
    return new Map<string, string>();
  }

  return new Map((data as ProfileRow[]).map((profile) => [profile.id, profile.display_name]));
}

export default async function Home() {
  const user = await requireUser("/");
  const supabase = await createClient();

  await ensureProfile(supabase, user);

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id,author_id,title,content,post_type,created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: snapshotData, error: snapshotError } = await supabase
    .from("portfolio_snapshots")
    .select("id,owner_id,created_by,title,notes,created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (postError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        首页动态加载失败：{postError.message}
      </section>
    );
  }

  const posts = (postData ?? []) as PostRow[];
  const snapshots = isMissingTableError(snapshotError)
    ? []
    : ((snapshotData ?? []) as SnapshotRow[]);

  const postIds = posts.map((post) => post.id);
  const snapshotIds = snapshots.map((snapshot) => snapshot.id);
  const authorIds = Array.from(
    new Set([
      ...posts.map((post) => post.author_id),
      ...snapshots.map((snapshot) => snapshot.created_by ?? snapshot.owner_id).filter(Boolean),
    ] as string[]),
  );

  const profiles = await getProfiles(supabase, authorIds);

  let postSymbols = new Map<string, string[]>();

  if (postIds.length > 0) {
    const { data: relationData } = await supabase
      .from("post_stocks")
      .select("post_id,stock_id")
      .in("post_id", postIds);

    const relations = (relationData ?? []) as PostStockRow[];
    const stockIds = Array.from(new Set(relations.map((relation) => relation.stock_id)));

    if (stockIds.length > 0) {
      const { data: stockData } = await supabase
        .from("stocks")
        .select("id,symbol")
        .in("id", stockIds);
      const stocks = (stockData ?? []) as StockRow[];
      const stockMap = new Map(stocks.map((stock) => [stock.id, stock.symbol]));

      postSymbols = relations.reduce((map, relation) => {
        const symbol = stockMap.get(relation.stock_id);
        if (!symbol) {
          return map;
        }

        map.set(relation.post_id, [...(map.get(relation.post_id) ?? []), symbol]);
        return map;
      }, new Map<string, string[]>());
    }
  }

  let snapshotItems = new Map<string, PortfolioItemRow[]>();

  if (snapshotIds.length > 0) {
    const { data: itemData, error: itemError } = await supabase
      .from("portfolio_items")
      .select("snapshot_id,symbol,position_percent")
      .in("snapshot_id", snapshotIds)
      .limit(60);

    if (!itemError || !isMissingTableError(itemError)) {
      snapshotItems = ((itemData ?? []) as PortfolioItemRow[]).reduce((map, item) => {
        const currentItems = map.get(item.snapshot_id) ?? [];
        if (currentItems.length < 3) {
          map.set(item.snapshot_id, [...currentItems, item]);
        }
        return map;
      }, new Map<string, SnapshotItemRow[]>());
    }
  }

  const feedItems: FeedItem[] = [
    ...posts.map((post) => ({
      id: post.id,
      kind: "post" as const,
      authorId: post.author_id,
      authorName: profiles.get(post.author_id) ?? `成员 ${post.author_id.slice(0, 8)}`,
      createdAt: post.created_at,
      href: `/posts/${post.id}`,
      postType: post.post_type,
      title: post.title,
      preview: getPreview(post.content),
      symbols: postSymbols.get(post.id) ?? [],
    })),
    ...snapshots.map((snapshot) => {
      const authorId = snapshot.created_by ?? snapshot.owner_id ?? "";

      return {
        id: snapshot.id,
        kind: "snapshot" as const,
        authorId,
        authorName: authorId ? profiles.get(authorId) ?? `成员 ${authorId.slice(0, 8)}` : "未知成员",
        createdAt: snapshot.created_at,
        href: `/portfolio/snapshots/${snapshot.id}`,
        title: snapshot.title ?? "未命名持仓快照",
        items: snapshotItems.get(snapshot.id) ?? [],
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">首页</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          最近的想法、链接、新闻、复盘和持仓快照会按时间汇总在这里。
        </p>
      </div>

      {feedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center">
          <h2 className="text-base font-medium">还没有动态</h2>
          <p className="mt-2 text-sm text-zinc-600">先发布一条股票笔记，或之后添加持仓快照。</p>
          <Link
            href="/quick"
            className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            去发布
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {feedItems.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.href}
              className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{item.authorName}</span>
                <span>·</span>
                <span>{formatTime(item.createdAt)}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                  {item.kind === "post" ? postTypeLabels[item.postType] : "持仓快照"}
                </span>
              </div>

              {item.kind === "post" ? (
                <div className="mt-3 space-y-2">
                  <h2 className="text-base font-semibold text-zinc-900">
                    {item.title ?? item.preview}
                  </h2>
                  {item.title ? <p className="text-sm leading-6 text-zinc-600">{item.preview}</p> : null}
                  {item.symbols.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.symbols.map((symbol) => (
                        <span
                          key={symbol}
                          className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <h2 className="text-base font-semibold text-zinc-900">{item.title}</h2>
                  {item.items.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.items.map((portfolioItem) => (
                        <span
                          key={`${item.id}-${portfolioItem.symbol}`}
                          className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-700"
                        >
                          {portfolioItem.symbol}
                          {portfolioItem.position_percent
                            ? ` · ${portfolioItem.position_percent}%`
                            : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600">暂无持仓明细预览</p>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
