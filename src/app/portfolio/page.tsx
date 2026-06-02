import Link from "next/link";
import { PortfolioSnapshotForm } from "@/components/portfolio-snapshot-form";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

type SnapshotRow = {
  id: string;
  title: string | null;
  notes: string | null;
  snapshot_date: string | null;
  created_at: string;
};

type PortfolioItemRow = {
  snapshot_id: string;
  symbol: string;
  market: string;
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

export default async function PortfolioPage() {
  const user = await requireUser("/portfolio");
  const supabase = await createClient();

  const { data: snapshotData, error: snapshotError } = await supabase
    .from("portfolio_snapshots")
    .select("id,title,notes,snapshot_date,created_at")
    .eq("owner_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

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

  if (snapshotIds.length > 0) {
    const { data: itemData } = await supabase
      .from("portfolio_items")
      .select("snapshot_id,symbol,market,position_percent")
      .in("snapshot_id", snapshotIds);

    itemsBySnapshot = ((itemData ?? []) as PortfolioItemRow[]).reduce((map, item) => {
      const currentItems = map.get(item.snapshot_id) ?? [];
      map.set(item.snapshot_id, [...currentItems, item]);
      return map;
    }, new Map<string, PortfolioItemRow[]>());
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">持仓</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          手动记录组合仓位快照，用于之后回顾当时的配置和想法。
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">最新快照</h2>
        {latestSnapshot ? (
          <Link
            href={`/portfolio/snapshots/${latestSnapshot.id}`}
            className="mt-4 block rounded-xl border border-zinc-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{getSnapshotTitle(latestSnapshot)}</h3>
              <span className="text-xs text-zinc-500">{formatTime(latestSnapshot.created_at)}</span>
            </div>
            {latestSnapshot.notes ? (
              <p className="mt-2 text-sm leading-6 text-zinc-600">{latestSnapshot.notes}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {(itemsBySnapshot.get(latestSnapshot.id) ?? []).slice(0, 5).map((item) => (
                <span
                  key={`${item.symbol}-${item.market}`}
                  className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                >
                  {item.symbol} · {item.position_percent}%
                </span>
              ))}
            </div>
          </Link>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">还没有持仓快照。</p>
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
              <Link
                key={snapshot.id}
                href={`/portfolio/snapshots/${snapshot.id}`}
                className="block rounded-xl border border-zinc-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{getSnapshotTitle(snapshot)}</h3>
                  <span className="text-xs text-zinc-500">{formatTime(snapshot.created_at)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(itemsBySnapshot.get(snapshot.id) ?? []).slice(0, 5).map((item) => (
                    <span
                      key={`${item.symbol}-${item.market}`}
                      className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-700"
                    >
                      {item.symbol} · {item.position_percent}%
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
