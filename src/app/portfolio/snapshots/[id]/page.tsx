import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsSection } from "@/components/comments-section";
import { PortfolioHoldingSections } from "@/components/portfolio-holding-sections";
import { PortfolioSnapshotDeleteButton } from "@/components/portfolio-snapshot-delete-button";
import { requireUser } from "@/lib/auth/require-user";
import { getCommentsForTarget } from "@/lib/comments/data";
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
  option_side: string | null;
  strike_price: number | string | null;
  expiration_date: string | null;
  contract_count: number | string | null;
  premium: number | string | null;
  previous_percent: number | string | null;
  position_percent: number | string;
  action_type: string | null;
  change_reason: string | null;
  cost_price: number | string | null;
  reference_price: number | string | null;
  currency: string | null;
  margin_note: string | null;
  risk_note: string | null;
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
      "id,symbol,market,asset_type,underlying_symbol,option_type,option_side,strike_price,expiration_date,contract_count,premium,previous_percent,position_percent,action_type,change_reason,cost_price,reference_price,currency,margin_note,risk_note,note",
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
        <PortfolioHoldingSections items={items} />
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
