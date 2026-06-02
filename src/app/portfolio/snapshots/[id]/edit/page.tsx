import Link from "next/link";
import { notFound } from "next/navigation";
import { PortfolioSnapshotEditForm } from "@/components/portfolio-snapshot-edit-form";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

type SnapshotRow = {
  id: string;
  owner_id: string;
  title: string | null;
  notes: string | null;
};

type PortfolioItemRow = {
  id: string;
  symbol: string;
  market: string;
  previous_percent: number | string | null;
  position_percent: number | string;
  action_type: string | null;
  change_reason: string | null;
  cost_price: number | string | null;
  reference_price: number | string | null;
  currency: string;
  note: string | null;
};

type SnapshotEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SnapshotEditPage({ params }: SnapshotEditPageProps) {
  const { id } = await params;
  const user = await requireUser(`/portfolio/snapshots/${id}/edit`);
  const supabase = await createClient();

  const { data: snapshotData, error: snapshotError } = await supabase
    .from("portfolio_snapshots")
    .select("id,owner_id,title,notes")
    .eq("id", id)
    .eq("owner_id", user.id)
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
      "id,symbol,market,previous_percent,position_percent,action_type,change_reason,cost_price,reference_price,currency,note",
    )
    .eq("snapshot_id", id)
    .order("position_percent", { ascending: false });

  if (itemError) {
    throw new Error(itemError.message);
  }

  const items = (itemData ?? []) as PortfolioItemRow[];

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">编辑持仓快照</h1>
            <p className="mt-2 text-sm text-zinc-600">只能编辑你自己创建的持仓快照。</p>
          </div>
          <Link
            href={`/portfolio/snapshots/${id}`}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            返回详情
          </Link>
        </div>
      </div>

      <PortfolioSnapshotEditForm snapshot={snapshot} items={items} />
    </section>
  );
}
