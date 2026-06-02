import Link from "next/link";
import { notFound } from "next/navigation";
import { PortfolioSnapshotDeleteButton } from "@/components/portfolio-snapshot-delete-button";
import { requireUser } from "@/lib/auth/require-user";
import {
  getPortfolioItemDisplayName,
  getPortfolioItemKindLabel,
  isOptionItem,
} from "@/lib/portfolio/item-display";
import {
  getActivePortfolioSnapshots,
  getPortfolioItemsForSnapshots,
  getPortfolioProfileMap,
  getSnapshotEffectiveDate,
  getSnapshotTitle,
  groupPortfolioItemsBySnapshot,
  type PortfolioItemRow,
  type PortfolioSnapshotRow,
} from "@/lib/portfolio/data";
import { actionTypeLabels, formatPositionChange } from "@/lib/portfolio/position-change";
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

function SnapshotPreviewCard({
  snapshot,
  items,
  canManage,
}: {
  snapshot: PortfolioSnapshotRow;
  items: PortfolioItemRow[];
  canManage: boolean;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{getSnapshotTitle(snapshot)}</h3>
          <p className="mt-2 text-sm text-zinc-500">
            {formatDate(getSnapshotEffectiveDate(snapshot))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/portfolio/snapshots/${snapshot.id}`}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            查看快照
          </Link>
          {canManage ? (
            <>
              <Link
                href={`/portfolio/snapshots/${snapshot.id}/edit`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
              >
                编辑
              </Link>
              <PortfolioSnapshotDeleteButton snapshotId={snapshot.id} />
            </>
          ) : null}
        </div>
      </div>

      {snapshot.notes ? (
        <p className="mt-3 text-sm leading-6 text-zinc-600">{snapshot.notes}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">这份快照还没有持仓明细。</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item.id}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
            >
              {getPortfolioItemDisplayName(item)} ·{" "}
              {formatPositionChange(item.previous_percent, item.position_percent)}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default async function PortfolioUserDetailPage({ params }: PortfolioUserDetailPageProps) {
  const { userId } = await params;
  const viewer = await requireUser(`/portfolios/${userId}`);
  const supabase = await createClient();

  const snapshots = await getActivePortfolioSnapshots(supabase, {
    ownerId: userId,
  });
  const profileMap = await getPortfolioProfileMap(supabase, [userId]);

  if (snapshots.length === 0 && !profileMap.has(userId)) {
    notFound();
  }

  const items = await getPortfolioItemsForSnapshots(
    supabase,
    snapshots.map((snapshot) => snapshot.id),
  );
  const itemsBySnapshot = groupPortfolioItemsBySnapshot(items);
  const latestSnapshot = snapshots[0] ?? null;
  const historicalSnapshots = snapshots.slice(1);
  const recentChanges = snapshots.flatMap((snapshot) =>
    (itemsBySnapshot.get(snapshot.id) ?? [])
      .filter(
        (item) =>
          item.previous_percent !== null || Boolean(item.action_type) || Boolean(item.change_reason),
      )
      .map((item) => ({ snapshot, item })),
  );
  const canManage = viewer.id === userId;
  const displayName = profileMap.get(userId) ?? `成员 ${userId.slice(0, 8)}`;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{displayName} 的持仓主页</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              查看最新持仓、历史快照和近期仓位变化。股票与期权会分别清晰展示。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/portfolios"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              返回圈内持仓
            </Link>
            {canManage ? (
              <Link
                href="/portfolio/export"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
              >
                导出操作流
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">最新持仓快照</h2>
          {latestSnapshot ? (
            <div className="mt-4">
              <SnapshotPreviewCard
                snapshot={latestSnapshot}
                items={itemsBySnapshot.get(latestSnapshot.id) ?? []}
                canManage={canManage}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">这个成员还没有可展示的持仓快照。</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">近期仓位变化</h2>
        {recentChanges.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">最近还没有带仓位变化信息的调仓记录。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentChanges.slice(0, 20).map(({ snapshot, item }) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-zinc-900">
                      {getPortfolioItemDisplayName(item)} ·{" "}
                      {formatPositionChange(item.previous_percent, item.position_percent)}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {getSnapshotTitle(snapshot)} · {formatDate(getSnapshotEffectiveDate(snapshot))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {getPortfolioItemKindLabel(item)}
                    </span>
                    {item.action_type ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {actionTypeLabels[item.action_type] ?? item.action_type}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div
                  className={`mt-3 grid gap-2 text-sm ${
                    isOptionItem(item) ? "md:grid-cols-5" : "md:grid-cols-4"
                  }`}
                >
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-zinc-500">市场</div>
                    <div className="mt-1 text-zinc-900">{item.market ?? "US"}</div>
                  </div>
                  {isOptionItem(item) ? (
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-zinc-500">期权方向</div>
                      <div className="mt-1 text-zinc-900">
                        {item.option_type === "put"
                          ? "Put"
                          : item.option_type === "call"
                            ? "Call"
                            : "未填写"}
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-zinc-500">成本价</div>
                    <div className="mt-1 text-zinc-900">{item.cost_price ?? "未填写"}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-zinc-500">现价</div>
                    <div className="mt-1 text-zinc-900">{item.reference_price ?? "未填写"}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-zinc-500">币种</div>
                    <div className="mt-1 text-zinc-900">{item.currency ?? "USD"}</div>
                  </div>
                </div>
                {item.change_reason ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    变化原因：{item.change_reason}
                  </p>
                ) : null}
                {item.note ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-600">条目备注：{item.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">历史快照</h2>
        {historicalSnapshots.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">暂时还没有历史快照。</p>
        ) : (
          <div className="mt-4 space-y-4">
            {historicalSnapshots.map((snapshot) => (
              <SnapshotPreviewCard
                key={snapshot.id}
                snapshot={snapshot}
                items={itemsBySnapshot.get(snapshot.id) ?? []}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
