import Link from "next/link";
import {
  getOptionSideLabel,
  getPortfolioItemDisplayName,
  splitPortfolioItems,
} from "@/lib/portfolio/item-display";
import { actionTypeLabels, formatPositionChange } from "@/lib/portfolio/position-change";

type HoldingItem = {
  id: string;
  symbol: string;
  market: string | null;
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

function emptyText(value: number | string | null | undefined) {
  return value === null || value === undefined || value === "" ? "未填写" : String(value);
}

function EquityCard({ item }: { item: HoldingItem }) {
  const market = item.market ?? "US";

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href={`/stocks/${encodeURIComponent(market)}/${encodeURIComponent(item.symbol)}`}
            className="text-lg font-semibold text-blue-700 hover:underline"
          >
            {getPortfolioItemDisplayName(item)}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">股票 / ETF</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">{market}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
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

      <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
        <div className="rounded-lg bg-zinc-50 p-3">
          <div className="text-zinc-500">仓位变化</div>
          <div className="mt-1 font-medium text-zinc-900">
            {formatPositionChange(item.previous_percent, item.position_percent)}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <div className="text-zinc-500">成本价</div>
          <div className="mt-1 text-zinc-900">{emptyText(item.cost_price)}</div>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <div className="text-zinc-500">现价</div>
          <div className="mt-1 text-zinc-900">{emptyText(item.reference_price)}</div>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <div className="text-zinc-500">币种</div>
          <div className="mt-1 text-zinc-900">{item.currency ?? "USD"}</div>
        </div>
      </div>

      {item.change_reason ? (
        <p className="mt-3 text-sm leading-6 text-zinc-600">变化原因：{item.change_reason}</p>
      ) : null}
      {item.note ? <p className="mt-2 text-sm leading-6 text-zinc-600">{item.note}</p> : null}
    </div>
  );
}

function OptionCard({ item }: { item: HoldingItem }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-semibold text-zinc-900">{getPortfolioItemDisplayName(item)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="rounded-full bg-white px-2 py-0.5 text-violet-700">期权</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-zinc-600">
              {item.market ?? "US"}
            </span>
          </div>
        </div>
        {item.action_type ? (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
            {actionTypeLabels[item.action_type] ?? item.action_type}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
        <div className="rounded-lg bg-white p-3">
          <div className="text-zinc-500">标的</div>
          <div className="mt-1 text-zinc-900">{item.underlying_symbol ?? item.symbol}</div>
        </div>
        <div className="rounded-lg bg-white p-3">
          <div className="text-zinc-500">Call / Put</div>
          <div className="mt-1 text-zinc-900">{emptyText(item.option_type)}</div>
        </div>
        <div className="rounded-lg bg-white p-3">
          <div className="text-zinc-500">买卖方向</div>
          <div className="mt-1 text-zinc-900">{getOptionSideLabel(item.option_side)}</div>
        </div>
        <div className="rounded-lg bg-white p-3">
          <div className="text-zinc-500">到期日</div>
          <div className="mt-1 text-zinc-900">{emptyText(item.expiration_date)}</div>
        </div>
        <div className="rounded-lg bg-white p-3">
          <div className="text-zinc-500">行权价</div>
          <div className="mt-1 text-zinc-900">{emptyText(item.strike_price)}</div>
        </div>
        <div className="rounded-lg bg-white p-3">
          <div className="text-zinc-500">合约数量</div>
          <div className="mt-1 text-zinc-900">{emptyText(item.contract_count)}</div>
        </div>
        <div className="rounded-lg bg-white p-3">
          <div className="text-zinc-500">权利金</div>
          <div className="mt-1 text-zinc-900">{emptyText(item.premium)}</div>
        </div>
        <div className="rounded-lg bg-white p-3">
          <div className="text-zinc-500">参考价</div>
          <div className="mt-1 text-zinc-900">{emptyText(item.reference_price)}</div>
        </div>
      </div>

      {item.margin_note ? (
        <p className="mt-2 text-sm leading-6 text-zinc-600">保证金说明：{item.margin_note}</p>
      ) : null}
      {item.risk_note ? (
        <p className="mt-2 text-sm leading-6 text-zinc-600">风险说明：{item.risk_note}</p>
      ) : null}
      {item.change_reason ? (
        <p className="mt-2 text-sm leading-6 text-zinc-600">变化原因：{item.change_reason}</p>
      ) : null}
      {item.note ? <p className="mt-2 text-sm leading-6 text-zinc-600">{item.note}</p> : null}
    </div>
  );
}

export function PortfolioHoldingSections({ items }: { items: HoldingItem[] }) {
  const { equityItems, optionItems } = splitPortfolioItems(items);

  if (items.length === 0) {
    return <p className="mt-3 text-sm text-zinc-600">这个快照还没有持仓明细。</p>;
  }

  return (
    <div className="mt-4 space-y-5">
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">普通持仓 / 股票 ETF</h3>
        {equityItems.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无普通股票 / ETF 持仓。</p>
        ) : (
          equityItems.map((item) => <EquityCard key={item.id} item={item} />)
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">期权持仓</h3>
        {optionItems.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无期权持仓。</p>
        ) : (
          optionItems.map((item) => <OptionCard key={item.id} item={item} />)
        )}
      </section>
    </div>
  );
}
