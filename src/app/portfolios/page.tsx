import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getCommentCountsForTargets } from "@/lib/comments/data";
import { getPortfolioItemDisplayName, splitPortfolioItems } from "@/lib/portfolio/item-display";
import {
  getActivePortfolioSnapshots,
  getPortfolioItemsForSnapshots,
  getSnapshotEffectiveDate,
  getSnapshotTitle,
  groupPortfolioItemsBySnapshot,
  type PortfolioSnapshotRow,
} from "@/lib/portfolio/data";
import { formatPositionChange } from "@/lib/portfolio/position-change";
import { createClient } from "@/lib/supabase/server";

type ProfileIdRow = {
  id: string;
  display_name: string;
};

type LatestEntry = {
  userId: string;
  snapshot: PortfolioSnapshotRow;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function PortfoliosPage() {
  await requireUser("/portfolios");

  const supabase = await createClient();
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name")
    .eq("is_active", true);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profiles = (profileData ?? []) as ProfileIdRow[];
  const profileIds = profiles.map((profile) => profile.id);
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  const latestEntries = (
    await Promise.all(
      profileIds.map(async (userId) => {
        const [snapshot] = await getActivePortfolioSnapshots(supabase, {
          ownerId: userId,
          limit: 1,
        });

        return snapshot
          ? {
              userId,
              snapshot,
            }
          : null;
      }),
    )
  )
    .filter((entry): entry is LatestEntry => entry !== null)
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
              查看圈内成员最新一份持仓快照。股票和期权都会显示在这里。
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
        <div className="space-y-4">
          {latestEntries.map(({ userId, snapshot }) => {
            const snapshotItems = itemsBySnapshot.get(snapshot.id) ?? [];
            const { equityItems, optionItems } = splitPortfolioItems(snapshotItems);

            return (
              <article
                key={snapshot.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm text-zinc-500">成员</div>
                    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
                      {profileNames.get(userId) ?? `成员 ${userId.slice(0, 8)}`}
                    </h2>
                    <div className="mt-2 text-sm text-zinc-600">
                      {getSnapshotTitle(snapshot)} · {formatDate(getSnapshotEffectiveDate(snapshot))}
                    </div>
                  </div>
                  <Link
                    href={`/portfolios/${userId}`}
                    className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50"
                  >
                    查看详情
                  </Link>
                </div>

                {snapshotItems.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-600">这份快照还没有持仓明细。</p>
                ) : (
                  <>
                    <div className="mt-4 space-y-3 md:hidden">
                      {equityItems.map((item) => (
                        <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium text-zinc-900">
                              {getPortfolioItemDisplayName(item)}
                            </div>
                            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-zinc-600">
                              {item.market ?? "US"}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-zinc-700">
                            {formatPositionChange(item.previous_percent, item.position_percent)}
                          </div>
                        </div>
                      ))}
                      {optionItems.map((item) => (
                        <div key={item.id} className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium text-zinc-900">
                              {getPortfolioItemDisplayName(item)}
                            </div>
                            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-violet-700">
                              期权
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 hidden overflow-x-auto md:block">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-zinc-500">
                          <tr className="border-b border-zinc-200">
                            <th className="py-2 pr-4 font-medium">标的</th>
                            <th className="py-2 pr-4 font-medium">市场</th>
                            <th className="py-2 pr-4 font-medium">仓位</th>
                          </tr>
                        </thead>
                        <tbody>
                          {equityItems.map((item) => (
                            <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                              <td className="py-3 pr-4 font-medium text-zinc-900">
                                {getPortfolioItemDisplayName(item)}
                              </td>
                              <td className="py-3 pr-4 text-zinc-600">{item.market ?? "US"}</td>
                              <td className="py-3 pr-4 text-zinc-700">
                                {formatPositionChange(item.previous_percent, item.position_percent)}
                              </td>
                            </tr>
                          ))}
                          {optionItems.map((item) => (
                            <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                              <td className="py-3 pr-4 font-medium text-zinc-900">
                                {getPortfolioItemDisplayName(item)}
                              </td>
                              <td className="py-3 pr-4 text-zinc-600">{item.market ?? "US"}</td>
                              <td className="py-3 pr-4 text-violet-700">期权持仓</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                <div className="mt-4 text-xs text-zinc-500">
                  评论 {commentCountsBySnapshot.get(snapshot.id) ?? 0}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
