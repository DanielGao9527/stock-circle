import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsSection } from "@/components/comments-section";
import { PortfolioSnapshotDeleteButton } from "@/components/portfolio-snapshot-delete-button";
import { requireUser } from "@/lib/auth/require-user";
import { getCommentsForTarget } from "@/lib/comments/data";
import {
  getPortfolioItemDisplayName,
  getPortfolioItemKindLabel,
  isOptionItem,
} from "@/lib/portfolio/item-display";
import { actionTypeLabels, formatPositionChange } from "@/lib/portfolio/position-change";
import { createClient } from "@/lib/supabase/server";

type SnapshotRow = {
  id: string;
  owner_id: string;
  title: string | null;
  notes: string | null;
  snapshot_date: string | null;
  created_at: string;
};

type PortfolioItemRow = {
  id: string;
  symbol: string;
  market: string;
  asset_type: string | null;
  underlying_symbol: string | null;
  option_type: string | null;
  strike_price: number | string | null;
  expiration_date: string | null;
  previous_percent: number | string | null;
  position_percent: number | string;
  action_type: string | null;
  change_reason: string | null;
  cost_price: number | string | null;
  reference_price: number | string | null;
  currency: string;
  note: string | null;
};

type SnapshotDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function SnapshotDetailPage({ params }: SnapshotDetailPageProps) {
  const { id } = await params;
  const user = await requireUser(`/portfolio/snapshots/${id}`);

  const supabase = await createClient();
  const { data: snapshotData, error: snapshotError } = await supabase
    .from("portfolio_snapshots")
    .select("id,owner_id,title,notes,snapshot_date,created_at")
    .eq("id", id)
    .is("deleted_at", null)
    .neq("status", "hidden")
    .maybeSingle();

  if (snapshotError) {
    throw new Error(snapshotError.message);
  }

  if (!snapshotData) {
    notFound();
  }

  const snapshot = snapshotData as SnapshotRow;
  const { data: itemData, error: itemError } = await supabase
    .from("portfolio_items")
    .select(
      "id,symbol,market,asset_type,underlying_symbol,option_type,strike_price,expiration_date,previous_percent,position_percent,action_type,change_reason,cost_price,reference_price,currency,note",
    )
    .eq("snapshot_id", id)
    .order("position_percent", { ascending: false });

  if (itemError) {
    throw new Error(itemError.message);
  }

  const items = (itemData ?? []) as PortfolioItemRow[];
  const comments = await getCommentsForTarget(supabase, "snapshot", snapshot.id);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {snapshot.title ?? "未命名持仓快照"}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">{formatTime(snapshot.created_at)}</p>
          </div>
          <Link
            href="/portfolio"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            返回持仓
          </Link>
        </div>

        {snapshot.owner_id === user.id ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/portfolio/snapshots/${snapshot.id}/edit`}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              编辑
            </Link>
            <PortfolioSnapshotDeleteButton snapshotId={snapshot.id} />
          </div>
        ) : null}

        {snapshot.notes ? (
          <p className="mt-4 text-sm leading-6 text-zinc-600">{snapshot.notes}</p>
        ) : null}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">持仓明细</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">这个快照还没有持仓明细。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/stocks/${encodeURIComponent(item.market)}/${encodeURIComponent(item.symbol)}`}
                      className="text-lg font-semibold text-blue-700 hover:underline"
                    >
                      {getPortfolioItemDisplayName(item)}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">
                        {getPortfolioItemKindLabel(item)}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">
                        {item.market}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-zinc-900">
                      {formatPositionChange(item.previous_percent, item.position_percent)}
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
                    <div className="text-zinc-500">仓位变化</div>
                    <div className="mt-1 font-medium text-zinc-900">
                      {formatPositionChange(item.previous_percent, item.position_percent)}
                    </div>
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
                    <div className="mt-1 text-zinc-900">{item.currency}</div>
                  </div>
                </div>

                {item.note ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{item.note}</p>
                ) : null}
                {item.change_reason ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    变化原因：{item.change_reason}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <CommentsSection
        targetType="snapshot"
        targetId={snapshot.id}
        comments={comments}
        currentUserId={user.id}
      />
    </section>
  );
}
