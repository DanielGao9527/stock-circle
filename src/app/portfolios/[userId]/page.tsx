import Link from "next/link";
import { notFound } from "next/navigation";
import { PortfolioHoldingSections } from "@/components/portfolio-holding-sections";
import { requireUser } from "@/lib/auth/require-user";
import { getCommentCountsForTargets } from "@/lib/comments/data";
import {
  getActivePortfolioSnapshots,
  getPortfolioItemsForSnapshots,
  getPortfolioProfileMap,
  getSnapshotEffectiveDate,
  getSnapshotTitle,
  type PortfolioSnapshotRow,
} from "@/lib/portfolio/data";
import {
  getOptionSummary,
  getTopEquityHoldings,
  splitPortfolioDisplayItems,
} from "@/lib/portfolio/display";
import { createClient } from "@/lib/supabase/server";

type PortfolioUserDetailPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getMemberSnapshotTitle(snapshot: PortfolioSnapshotRow, displayName: string) {
  return snapshot.title ?? `${displayName} 的最新持仓`;
}

export default async function PortfolioUserDetailPage({ params }: PortfolioUserDetailPageProps) {
  const { userId } = await params;
  const viewer = await requireUser(`/portfolios/${userId}`);
  const supabase = await createClient();

  const snapshots = await getActivePortfolioSnapshots(supabase, {
    ownerId: userId,
    limit: 20,
  });
  const profileMap = await getPortfolioProfileMap(supabase, [userId]);

  if (snapshots.length === 0 && !profileMap.has(userId)) {
    notFound();
  }

  const latestSnapshot = snapshots[0] ?? null;
  const historicalSnapshots = snapshots.slice(1, 20);
  const snapshotIds = snapshots.map((snapshot) => snapshot.id);
  const commentCountsBySnapshot = await getCommentCountsForTargets(supabase, "snapshot", snapshotIds);
  const latestItems = latestSnapshot
    ? await getPortfolioItemsForSnapshots(supabase, [latestSnapshot.id])
    : [];
  const { optionItems } = splitPortfolioDisplayItems(latestItems);
  const topEquityItems = getTopEquityHoldings(latestItems, 5);
  const optionSummary = getOptionSummary(optionItems);
  const canManage = viewer.id === userId;
  const displayName = profileMap.get(userId) ?? `成员 ${userId.slice(0, 8)}`;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm text-zinc-500">成员持仓</div>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">
              {displayName}
            </h1>
            {latestSnapshot ? (
              <div className="mt-3 space-y-1 text-sm leading-6 text-zinc-600">
                <p>最新快照：{getMemberSnapshotTitle(latestSnapshot, displayName)}</p>
                <p>最近更新：{formatDate(getSnapshotEffectiveDate(latestSnapshot))}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                这个成员还没有可展示的持仓快照。
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/portfolios"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              返回圈内持仓
            </Link>
            {canManage ? (
              <Link
                href="/portfolio/export"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50"
              >
                导出操作流
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {latestSnapshot ? (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold">
                  {getMemberSnapshotTitle(latestSnapshot, displayName)}
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  {formatDate(getSnapshotEffectiveDate(latestSnapshot))} · 评论{" "}
                  {commentCountsBySnapshot.get(latestSnapshot.id) ?? 0}
                </p>
              </div>
              <Link
                href={`/portfolio/snapshots/${latestSnapshot.id}`}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                查看快照页
              </Link>
            </div>

            {latestSnapshot.notes ? (
              <p className="mt-4 break-words text-sm leading-6 text-zinc-600">
                {latestSnapshot.notes}
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">股票持仓预览</div>
                <div className="mt-2 text-lg font-semibold text-zinc-900">
                  {topEquityItems.length} 个
                </div>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">期权持仓</div>
                <div className="mt-2 text-lg font-semibold text-zinc-900">
                  {optionSummary ?? "无期权持仓"}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">展示方式</div>
                <div className="mt-2 text-sm font-medium text-zinc-900">
                  股票与期权分开展示
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">最新持仓明细</h2>
            <PortfolioHoldingSections items={latestItems} />
          </section>
        </>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">历史快照</h2>
        {historicalSnapshots.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">暂时还没有历史快照。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {historicalSnapshots.map((snapshot) => (
              <Link
                key={snapshot.id}
                href={`/portfolio/snapshots/${snapshot.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words font-medium text-zinc-900">
                      {getSnapshotTitle(snapshot)}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatDate(getSnapshotEffectiveDate(snapshot))}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                    <span>评论 {commentCountsBySnapshot.get(snapshot.id) ?? 0}</span>
                    <span className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700">
                      查看
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
