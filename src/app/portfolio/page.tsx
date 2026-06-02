import Link from "next/link";
import { PortfolioJsonImport } from "@/components/portfolio-json-import";
import { PortfolioSnapshotDeleteButton } from "@/components/portfolio-snapshot-delete-button";
import { PortfolioSnapshotForm } from "@/components/portfolio-snapshot-form";
import { requireUser } from "@/lib/auth/require-user";
import { getCommentCountsForTargets } from "@/lib/comments/data";
import { getPortfolioItemDisplayName, splitPortfolioItems } from "@/lib/portfolio/item-display";
import { formatPositionChange } from "@/lib/portfolio/position-change";
import { createClient } from "@/lib/supabase/server";

type SnapshotRow = {
  id: string;
  title: string | null;
  notes: string | null;
  snapshot_date: string | null;
  created_at: string;
};

type PortfolioItemRow = {
  id: string;
  snapshot_id: string;
  symbol: string;
  market: string;
  asset_type: string | null;
  underlying_symbol: string | null;
  option_type: string | null;
  strike_price: number | string | null;
  expiration_date: string | null;
  previous_percent: number | string | null;
  position_percent: number | string;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSnapshotTitle(snapshot: SnapshotRow) {
  return snapshot.title ?? "未命名持仓快照";
}

function SnapshotCard({
  snapshot,
  items,
  commentCount,
  highlight = false,
}: {
  snapshot: SnapshotRow;
  items: PortfolioItemRow[];
  commentCount: number;
  highlight?: boolean;
}) {
  const { equityItems, optionItems } = splitPortfolioItems(items);

  return (
    <article className="mt-4 rounded-xl border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{getSnapshotTitle(snapshot)}</h3>
        <span className="text-xs text-zinc-500">{formatTime(snapshot.created_at)}</span>
      </div>
      {snapshot.notes ? (
        <p className="mt-2 text-sm leading-6 text-zinc-600">{snapshot.notes}</p>
      ) : null}
      <div className="mt-3 text-xs text-zinc-500">评论 {commentCount}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {equityItems.slice(0, 5).map((item) => (
          <span
            key={item.id}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              highlight
                ? "border-blue-100 bg-blue-50 text-blue-700"
                : "border-zinc-200 text-zinc-700"
            }`}
          >
            {getPortfolioItemDisplayName(item)} ·{" "}
            {formatPositionChange(item.previous_percent, item.position_percent)}
          </span>
        ))}
        {optionItems.slice(0, 3).map((item) => (
          <span
            key={item.id}
            className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-xs text-violet-700"
          >
            {getPortfolioItemDisplayName(item)}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/portfolio/snapshots/${snapshot.id}`}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
        >
          查看
        </Link>
        <Link
          href={`/portfolio/snapshots/${snapshot.id}/edit`}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
        >
          编辑
        </Link>
        <PortfolioSnapshotDeleteButton snapshotId={snapshot.id} />
      </div>
    </article>
  );
}

export default async function PortfolioPage() {
  const user = await requireUser("/portfolio");
  const supabase = await createClient();

  const { data: snapshotData, error: snapshotError } = await supabase
    .from("portfolio_snapshots")
    .select("id,title,notes,snapshot_date,created_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .neq("status", "hidden")
    .order("created_at", { ascending: false })
    .limit(20);

  if (snapshotError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        持仓快照加载失败：{snapshotError.message}
      </section>
    );
  }

  const snapshots = (snapshotData ?? []) as SnapshotRow[];
  const latestSnapshot = snapshots[0] ?? null;
  const previousSnapshots = snapshots.slice(1);
  const snapshotIds = snapshots.map((snapshot) => snapshot.id);
  let itemsBySnapshot = new Map<string, PortfolioItemRow[]>();
  let commentCountsBySnapshot = new Map<string, number>();

  if (snapshotIds.length > 0) {
    commentCountsBySnapshot = await getCommentCountsForTargets(supabase, "snapshot", snapshotIds);

    const { data: itemData } = await supabase
      .from("portfolio_items")
      .select(
        "id,snapshot_id,symbol,market,asset_type,underlying_symbol,option_type,strike_price,expiration_date,previous_percent,position_percent",
      )
      .in("snapshot_id", snapshotIds)
      .order("position_percent", { ascending: false });

    itemsBySnapshot = ((itemData ?? []) as PortfolioItemRow[]).reduce((map, item) => {
      const currentItems = map.get(item.snapshot_id) ?? [];
      map.set(item.snapshot_id, [...currentItems, item]);
      return map;
    }, new Map<string, PortfolioItemRow[]>());
  }

  const latestPositions = latestSnapshot
    ? (itemsBySnapshot.get(latestSnapshot.id) ?? [])
        .filter((item) => item.asset_type !== "option")
        .map((item) => ({
          symbol: item.symbol,
          market: item.market ?? "US",
          previousPercent: String(item.position_percent),
        }))
    : [];

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">持仓</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          手动记录组合仓位快照，也支持用 JSON 模板快速导入。现在同一份快照里可以同时记录股票和期权。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="#portfolio-json-import"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            JSON 导入持仓
          </Link>
          <Link
            href="/portfolios"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            查看圈内持仓
          </Link>
          <Link
            href="/portfolio/export"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            导出操作流
          </Link>
        </div>
      </div>

      <div id="portfolio-json-import">
        <PortfolioJsonImport latestPositions={latestPositions} />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">最新快照</h2>
        {latestSnapshot ? (
          <SnapshotCard
            snapshot={latestSnapshot}
            items={itemsBySnapshot.get(latestSnapshot.id) ?? []}
            commentCount={commentCountsBySnapshot.get(latestSnapshot.id) ?? 0}
            highlight
          />
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-zinc-600">还没有持仓快照。</p>
            <Link
              href="#portfolio-json-import"
              className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              先用 JSON 导入一份
            </Link>
          </div>
        )}
      </section>

      <PortfolioSnapshotForm />

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">历史快照</h2>
        {previousSnapshots.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">暂无历史快照。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {previousSnapshots.map((snapshot) => (
              <SnapshotCard
                key={snapshot.id}
                snapshot={snapshot}
                items={itemsBySnapshot.get(snapshot.id) ?? []}
                commentCount={commentCountsBySnapshot.get(snapshot.id) ?? 0}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
