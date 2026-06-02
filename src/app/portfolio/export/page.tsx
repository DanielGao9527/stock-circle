import Link from "next/link";
import { PortfolioExportResult } from "@/components/portfolio-export-result";
import { requireUser } from "@/lib/auth/require-user";
import {
  getActivePortfolioSnapshots,
  getPortfolioItemsForSnapshots,
  getPortfolioProfileMap,
  groupPortfolioItemsBySnapshot,
} from "@/lib/portfolio/data";
import { buildPortfolioExportOutputs } from "@/lib/portfolio/export";
import { createClient } from "@/lib/supabase/server";

type PortfolioExportPageProps = {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
  }>;
};

type ResolvedRange = {
  range: string;
  startDate: string;
  endDate: string;
  rangeLabel: string;
  notice: string | null;
};

type RangeOption = {
  value: string;
  label: string;
  months?: number;
};

const rangeOptions: RangeOption[] = [
  { value: "1m", label: "最近 1 个月", months: 1 },
  { value: "2m", label: "最近 2 个月", months: 2 },
  { value: "6m", label: "最近 6 个月", months: 6 },
  { value: "1y", label: "最近 1 年", months: 12 },
  { value: "custom", label: "自定义日期区间" },
];

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function shiftMonths(base: Date, months: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isValidDateText(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function resolveRange(
  rawRange: string | undefined,
  rawStart: string | undefined,
  rawEnd: string | undefined,
): ResolvedRange {
  const today = new Date();
  const todayText = formatDateInput(today);
  const range = rangeOptions.some((option) => option.value === rawRange) ? rawRange! : "1m";

  if (range === "custom") {
    if (isValidDateText(rawStart) && isValidDateText(rawEnd) && rawStart <= rawEnd) {
      return {
        range,
        startDate: rawStart,
        endDate: rawEnd,
        rangeLabel: `${rawStart} 至 ${rawEnd}`,
        notice: null,
      };
    }

    const fallbackStart = formatDateInput(shiftMonths(today, -1));
    return {
      range,
      startDate: fallbackStart,
      endDate: todayText,
      rangeLabel: `${fallbackStart} 至 ${todayText}`,
      notice: "自定义日期区间未填写完整，已暂时回退到最近 1 个月。",
    };
  }

  const option = rangeOptions.find((item) => item.value === range);
  const startDate = formatDateInput(shiftMonths(today, -(option?.months ?? 1)));

  return {
    range,
    startDate,
    endDate: todayText,
    rangeLabel: `${option?.label ?? "最近 1 个月"}（${startDate} 至 ${todayText}）`,
    notice: null,
  };
}

export default async function PortfolioExportPage({ searchParams }: PortfolioExportPageProps) {
  const { range, start, end } = await searchParams;
  const user = await requireUser("/portfolio/export");
  const resolvedRange = resolveRange(range, start, end);
  const supabase = await createClient();

  const snapshots = await getActivePortfolioSnapshots(supabase, {
    ownerId: user.id,
    startDate: resolvedRange.startDate,
    endDate: resolvedRange.endDate,
    ascending: true,
  });
  const items = await getPortfolioItemsForSnapshots(
    supabase,
    snapshots.map((snapshot) => snapshot.id),
  );
  const itemsBySnapshot = groupPortfolioItemsBySnapshot(items);
  const profileMap = await getPortfolioProfileMap(supabase, [user.id]);
  const userDisplayName = profileMap.get(user.id) ?? `成员 ${user.id.slice(0, 8)}`;
  const outputs = buildPortfolioExportOutputs({
    userDisplayName,
    rangeLabel: resolvedRange.rangeLabel,
    startDate: resolvedRange.startDate,
    endDate: resolvedRange.endDate,
    snapshots: snapshots.map((snapshot) => ({
      snapshot,
      items: itemsBySnapshot.get(snapshot.id) ?? [],
    })),
  });

  return (
    <section className="space-y-4 md:space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">导出操作流</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              按日期区间整理自己的持仓快照和调仓明细，方便复制到外部工具做复盘分析。
            </p>
          </div>
          <Link
            href="/portfolio"
            className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            返回我的持仓
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-lg font-semibold">日期区间</h2>
        <form action="/portfolio/export" className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
          <label className="block space-y-1">
            <span className="text-sm font-medium">快捷区间</span>
            <select
              name="range"
              defaultValue={resolvedRange.range}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:px-3 md:py-2 md:text-sm"
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">开始日期</span>
            <input
              name="start"
              type="date"
              defaultValue={start ?? resolvedRange.startDate}
              className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:px-3 md:py-2 md:text-sm"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">结束日期</span>
            <input
              name="end"
              type="date"
              defaultValue={end ?? resolvedRange.endDate}
              className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:px-3 md:py-2 md:text-sm"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 md:w-auto md:px-4 md:py-2.5"
            >
              更新导出
            </button>
          </div>
        </form>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
          当前区间：{resolvedRange.rangeLabel}
        </div>

        {resolvedRange.notice ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            {resolvedRange.notice}
          </div>
        ) : null}
      </section>

      <PortfolioExportResult outputs={outputs} />
    </section>
  );
}
