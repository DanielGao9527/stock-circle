import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import {
  getActivePortfolioSnapshots,
  getLatestSnapshotsByUser,
  getPortfolioItemsForSnapshots,
  getPortfolioProfileMap,
  getSnapshotEffectiveDate,
  getSnapshotTitle,
  groupPortfolioItemsBySnapshot,
} from "@/lib/portfolio/data";
import { formatPositionChange } from "@/lib/portfolio/position-change";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function PortfoliosPage() {
  await requireUser("/portfolios");

  const supabase = await createClient();
  const snapshots = await getActivePortfolioSnapshots(supabase);
  const latestSnapshotsByUser = getLatestSnapshotsByUser(snapshots);
  const latestEntries = Array.from(latestSnapshotsByUser.entries()).map(([userId, snapshot]) => ({
    userId,
    snapshot,
  }));

  const snapshotIds = latestEntries.map((entry) => entry.snapshot.id);
  const items = await getPortfolioItemsForSnapshots(supabase, snapshotIds);
  const itemsBySnapshot = groupPortfolioItemsBySnapshot(items);
  const profiles = await getPortfolioProfileMap(
    supabase,
    latestEntries.map((entry) => entry.userId),
  );

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">圈内持仓</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              查看圈内每位成员最新一份持仓快照，快速了解最近的仓位分布和调仓方向。
            </p>
          </div>
          <Link
            href="/portfolio"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            回到我的持仓
          </Link>
        </div>
      </div>

      {latestEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
          暂时还没有成员公开出最新持仓快照。
        </div>
      ) : (
        <div className="grid gap-4">
          {latestEntries.map(({ userId, snapshot }) => {
            const snapshotItems = itemsBySnapshot.get(snapshot.id) ?? [];

            return (
              <article
                key={snapshot.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-zinc-500">成员</div>
                    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
                      {profiles.get(userId) ?? `成员 ${userId.slice(0, 8)}`}
                    </h2>
                    <div className="mt-2 text-sm text-zinc-600">
                      {getSnapshotTitle(snapshot)} · {formatDate(getSnapshotEffectiveDate(snapshot))}
                    </div>
                  </div>
                  <Link
                    href={`/portfolios/${userId}`}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
                  >
                    查看详情
                  </Link>
                </div>

                {snapshotItems.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-600">这份快照还没有持仓明细。</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-zinc-500">
                        <tr className="border-b border-zinc-200">
                          <th className="py-2 pr-4 font-medium">股票</th>
                          <th className="py-2 pr-4 font-medium">市场</th>
                          <th className="py-2 pr-4 font-medium">仓位</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshotItems.map((item) => (
                          <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                            <td className="py-3 pr-4 font-medium text-zinc-900">{item.symbol}</td>
                            <td className="py-3 pr-4 text-zinc-600">{item.market ?? "US"}</td>
                            <td className="py-3 pr-4 text-zinc-700">
                              {formatPositionChange(item.previous_percent, item.position_percent)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
