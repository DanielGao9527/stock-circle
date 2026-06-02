import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
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
  position_percent: number | string;
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
  await requireUser(`/portfolio/snapshots/${id}`);

  const supabase = await createClient();
  const { data: snapshotData, error: snapshotError } = await supabase
    .from("portfolio_snapshots")
    .select("id,owner_id,title,notes,snapshot_date,created_at")
    .eq("id", id)
    .eq("is_deleted", false)
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
    .select("id,symbol,market,position_percent,cost_price,reference_price,currency,note")
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

        {snapshot.notes ? (
          <p className="mt-4 text-sm leading-6 text-zinc-600">{snapshot.notes}</p>
        ) : null}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">持仓明细</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">这个快照没有明细。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/stocks/${encodeURIComponent(item.market)}/${encodeURIComponent(item.symbol)}`}
                    className="text-lg font-semibold text-blue-700 hover:underline"
                  >
                    {item.symbol}
                  </Link>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {item.market}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-zinc-500">仓位</div>
                    <div className="mt-1 font-medium text-zinc-900">{item.position_percent}%</div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-zinc-500">成本价</div>
                    <div className="mt-1 text-zinc-900">{item.cost_price ?? "未填写"}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-zinc-500">参考价</div>
                    <div className="mt-1 text-zinc-900">{item.reference_price ?? "未填写"}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-zinc-500">货币</div>
                    <div className="mt-1 text-zinc-900">{item.currency}</div>
                  </div>
                </div>

                {item.note ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{item.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
