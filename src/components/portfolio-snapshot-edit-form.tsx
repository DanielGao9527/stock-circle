"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type PortfolioSnapshotActionState,
  updatePortfolioSnapshot,
} from "@/app/portfolio/actions";

type SnapshotFormRow = {
  id: string;
  symbol: string;
  market: string;
  asset_type: "stock" | "option" | null;
  underlying_symbol: string | null;
  option_type: "call" | "put" | "" | null;
  option_side: "buy" | "sell" | "long" | "short" | "" | null;
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
  currency: string;
  margin_note: string | null;
  risk_note: string | null;
  note: string | null;
};

type PortfolioSnapshotEditFormProps = {
  snapshot: {
    id: string;
    title: string | null;
    notes: string | null;
  };
  items: SnapshotFormRow[];
};

const initialState: PortfolioSnapshotActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 md:w-auto"
    >
      {pending ? "保存中..." : "保存修改"}
    </button>
  );
}

function createEmptyRow(index: number): SnapshotFormRow {
  return {
    id: `new-${Date.now()}-${index}`,
    symbol: "",
    market: "US",
    asset_type: "stock",
    underlying_symbol: "",
    option_type: "",
    option_side: "",
    strike_price: "",
    expiration_date: "",
    contract_count: "",
    premium: "",
    previous_percent: "",
    position_percent: "",
    action_type: "",
    change_reason: "",
    cost_price: "",
    reference_price: "",
    currency: "USD",
    margin_note: "",
    risk_note: "",
    note: "",
  };
}

export function PortfolioSnapshotEditForm({
  snapshot,
  items,
}: PortfolioSnapshotEditFormProps) {
  const [rows, setRows] = useState<SnapshotFormRow[]>(
    items.length > 0
      ? items.map((item) => ({
          ...item,
          asset_type: item.asset_type ?? "stock",
          option_type: (item.option_type as "call" | "put" | "" | null) ?? "",
          option_side: (item.option_side as "buy" | "sell" | "long" | "short" | "" | null) ?? "",
          underlying_symbol: item.underlying_symbol ?? item.symbol,
          expiration_date: item.expiration_date ?? "",
          contract_count: item.contract_count ?? "",
          premium: item.premium ?? "",
          margin_note: item.margin_note ?? "",
          risk_note: item.risk_note ?? "",
        }))
      : [createEmptyRow(0)],
  );
  const [state, formAction] = useActionState(updatePortfolioSnapshot, initialState);

  function addRow() {
    setRows((currentRows) => [...currentRows, createEmptyRow(currentRows.length)]);
  }

  function removeRow(rowId: string) {
    setRows((currentRows) =>
      currentRows.length === 1 ? currentRows : currentRows.filter((row) => row.id !== rowId),
    );
  }

  function updateRow(
    rowId: string,
    field: keyof SnapshotFormRow,
    value: SnapshotFormRow[keyof SnapshotFormRow],
  ) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="snapshot_id" value={snapshot.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">标题（可选）</span>
          <input
            name="title"
            type="text"
            defaultValue={snapshot.title ?? ""}
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">备注（可选）</span>
          <input
            name="note"
            type="text"
            defaultValue={snapshot.notes ?? ""}
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium">持仓明细</h2>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            添加一行
          </button>
        </div>

        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl border border-zinc-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">第 {index + 1} 行</span>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                className="text-sm text-red-600 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                删除
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium">资产类型</span>
                <select
                  name="asset_type"
                  value={row.asset_type ?? "stock"}
                  onChange={(event) =>
                    updateRow(
                      row.id,
                      "asset_type",
                      (event.target.value === "option" ? "option" : "stock") as "stock" | "option",
                    )
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="stock">股票</option>
                  <option value="option">期权</option>
                </select>
              </label>

              <label className="block space-y-1 md:col-span-2">
                <span className="text-sm font-medium">
                  {row.asset_type === "option" ? "标的代码" : "股票代码"}
                </span>
                <input
                  name="symbol"
                  type="text"
                  value={row.symbol}
                  required={index === 0 && row.asset_type !== "option"}
                  onChange={(event) => updateRow(row.id, "symbol", event.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">市场</span>
                <input
                  name="market"
                  type="text"
                  value={row.market}
                  onChange={(event) => updateRow(row.id, "market", event.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">当前仓位 %</span>
                <input
                  name="position_percent"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={row.position_percent}
                  required={index === 0 && row.asset_type !== "option"}
                  onChange={(event) => updateRow(row.id, "position_percent", event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            {row.asset_type === "option" ? (
              <div className="mt-3 grid gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3 md:grid-cols-4">
                <input type="hidden" name="underlying_symbol" value={row.symbol} />
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Call / Put</span>
                  <select
                    name="option_type"
                    value={row.option_type ?? ""}
                    onChange={(event) =>
                      updateRow(row.id, "option_type", event.target.value as "call" | "put" | "")
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">请选择</option>
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">行权价</span>
                  <input
                    name="strike_price"
                    type="number"
                    min="0"
                    step="0.000001"
                    value={row.strike_price ?? ""}
                    onChange={(event) => updateRow(row.id, "strike_price", event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">到期日</span>
                  <input
                    name="expiration_date"
                    type="date"
                    value={row.expiration_date ?? ""}
                    onChange={(event) => updateRow(row.id, "expiration_date", event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">买卖方向</span>
                  <select
                    name="option_side"
                    value={row.option_side ?? ""}
                    onChange={(event) =>
                      updateRow(
                        row.id,
                        "option_side",
                        event.target.value as "buy" | "sell" | "long" | "short" | "",
                      )
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">未填写</option>
                    <option value="buy">买入</option>
                    <option value="sell">卖出</option>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">合约数量</span>
                  <input
                    name="contract_count"
                    type="number"
                    min="0"
                    step="0.000001"
                    value={row.contract_count ?? ""}
                    onChange={(event) => updateRow(row.id, "contract_count", event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">权利金</span>
                  <input
                    name="premium"
                    type="number"
                    min="0"
                    step="0.000001"
                    value={row.premium ?? ""}
                    onChange={(event) => updateRow(row.id, "premium", event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            ) : (
              <>
                <input type="hidden" name="underlying_symbol" value={row.symbol} />
                <input type="hidden" name="option_type" value="" />
                <input type="hidden" name="option_side" value="" />
                <input type="hidden" name="strike_price" value="" />
                <input type="hidden" name="expiration_date" value="" />
                <input type="hidden" name="contract_count" value="" />
                <input type="hidden" name="premium" value="" />
              </>
            )}

            <details className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                变化信息（可选）
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">上一仓位 %</span>
                  <input
                    name="previous_percent"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={row.previous_percent ?? ""}
                    onChange={(event) => updateRow(row.id, "previous_percent", event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">操作类型</span>
                  <select
                    name="action_type"
                    value={row.action_type ?? ""}
                    onChange={(event) => updateRow(row.id, "action_type", event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">自动推断</option>
                    <option value="new">新建</option>
                    <option value="increase">加仓</option>
                    <option value="reduce">减仓</option>
                    <option value="hold">持有不变</option>
                    <option value="clear">清仓</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">变化原因</span>
                  <input
                    name="change_reason"
                    type="text"
                    value={row.change_reason ?? ""}
                    onChange={(event) => updateRow(row.id, "change_reason", event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </details>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">成本价（可选）</span>
                <input
                  name="cost_price"
                  type="number"
                  min="0"
                  step="0.000001"
                  value={row.cost_price ?? ""}
                  onChange={(event) => updateRow(row.id, "cost_price", event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">现价（可选）</span>
                <input
                  name="reference_price"
                  type="number"
                  min="0"
                  step="0.000001"
                  value={row.reference_price ?? ""}
                  onChange={(event) => updateRow(row.id, "reference_price", event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">币种</span>
                <input
                  name="currency"
                  type="text"
                  value={row.currency}
                  onChange={(event) => updateRow(row.id, "currency", event.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <label className="mt-3 block space-y-1">
              <span className="text-sm font-medium">行备注（可选）</span>
              <input
                name="item_note"
                type="text"
                value={row.note ?? ""}
                onChange={(event) => updateRow(row.id, "note", event.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {row.asset_type === "option" ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">保证金说明</span>
                  <input
                    name="margin_note"
                    type="text"
                    value={row.margin_note ?? ""}
                    onChange={(event) => updateRow(row.id, "margin_note", event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">风险说明</span>
                  <input
                    name="risk_note"
                    type="text"
                    value={row.risk_note ?? ""}
                    onChange={(event) => updateRow(row.id, "risk_note", event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            ) : (
              <>
                <input type="hidden" name="margin_note" value="" />
                <input type="hidden" name="risk_note" value="" />
              </>
            )}
          </div>
        ))}
      </div>

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
