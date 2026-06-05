import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getCommentCountsForTargets } from "@/lib/comments/data";
import {
  formatPortfolioPositionChange,
  getActionLabel,
  getOptionSummary,
  getTopEquityHoldings,
  splitPortfolioDisplayItems,
} from "@/lib/portfolio/display";
import {
  getLatestActiveSnapshotsForUsers,
  getPortfolioItemsForSnapshots,
  getSnapshotEffectiveDate,
  groupPortfolioItemsBySnapshot,
  type PortfolioSnapshotRow,
} from "@/lib/portfolio/data";
import { createClient } from "@/lib/supabase/server";

type ProfileIdRow = {
  id: string;
  display_name: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getSnapshotDisplayTitle(snapshot: PortfolioSnapshotRow, displayName: string) {
  return snapshot.title ?? `${displayName} 的最新持仓`;
}

export default async function PortfoliosPage() {
  await requireUser("/portfolios");

  const supabase = await createClient();
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name")
    .eq("is_active", true)
    .order("display_name");

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profiles = (profileData ?? []) as ProfileIdRow[];
  const profileIds = profiles.map((profile) => profile.id);
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  const latestSnapshots = await getLatestActiveSnapshotsForUsers(supabase, profileIds);
  const latestEntries = latestSnapshots
    .map((snapshot) => {
      const userId = snapshot.owner_id ?? snapshot.created_by;
      return userId ? { userId, snapshot } : null;
    })
    .filter((entry): entry is { userId: string; snapshot: PortfolioSnapshotRow } => entry !== null)
    .sort((a, b) => new Date(b.snapshot.created_at).getTime() - new Date(a.snapshot.created_at).getTime());

  const snapshotIds = latestEntries.map((entry) => entry.snapshot.id);
  const items = await getPortfolioItemsForSnapshots(supabase, snapshotIds);
  const commentCountsBySnapshot = await getCommentCountsForTargets(supabase, "snapshot", snapshotIds);
  const itemsBySnapshot = groupPortfolioItemsBySnapshot(items);

  return (
    <section className="space-y-4 md:space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">圈内持仓</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              浏览圈内成员最新公开持仓。股票和期权分开展示，方便快速查看持仓结构。
            </p>
          </div>
          <Link
            href="/portfolio"
            className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            回到我的持仓
          </Link>
        </div>
      </div>

      {latestEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
          暂时还没有成员公开最新持仓快照。
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {latestEntries.map(({ userId, snapshot }) => {
            const displayName = profileNames.get(userId) ?? `成员 ${userId.slice(0, 8)}`;
            const snapshotItems = itemsBySnapshot.get(snapshot.id) ?? [];
            const { optionItems } = splitPortfolioDisplayItems(snapshotItems);
            const topEquityItems = getTopEquityHoldings(snapshotItems, 5);
            const optionSummary = getOptionSummary(optionItems);
            const commentCount = commentCountsBySnapshot.get(snapshot.id) ?? 0;

            return (
              <Link
                key={snapshot.id}
                href={`/portfolios/${userId}`}
                className="group block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30 md:p-5"
              >
                <article className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-500">{displayName}</div>
                      <h2 className="mt-1 break-words text-lg font-semibold text-zinc-900">
                        {getSnapshotDisplayTitle(snapshot, displayName)}
                      </h2>
                      <p className="mt-2 text-sm text-zinc-500">
                        最近更新：{formatDate(getSnapshotEffectiveDate(snapshot))}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                      评论 {commentCount}
                    </span>
                  </div>

                  {snapshot.notes ? (
                    <p className="break-words text-sm leading-6 text-zinc-600">{snapshot.notes}</p>
                  ) : null}

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-zinc-500">Top 股票持仓</div>
                    {topEquityItems.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-zinc-200 p-3 text-sm text-zinc-500">
                        暂无普通股票 / ETF 持仓。
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {topEquityItems.map((item) => {
                          const actionLabel = getActionLabel(item.action_type);

                          return (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                            >
                              <div className="min-w-0">
                                <span className="font-medium text-zinc-900">{item.symbol}</span>
                                <span className="ml-2 text-xs text-zinc-500">{item.market ?? "US"}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-right">
                                <span className="font-medium text-zinc-900">
                                  {formatPortfolioPositionChange(item)}
                                </span>
                                {actionLabel ? (
                                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-blue-700">
                                    {actionLabel}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                    <div className="text-sm text-zinc-600">
                      {optionSummary ?? "无期权持仓"}
                    </div>
                    <span className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition group-hover:bg-blue-700">
                      查看明细
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
