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
  previous_percent: number | string | null;
  position_percent: number | string;
  action_type: string | null;
  change_reason: string | null;
  cost_price: number | string | null;
  reference_price: number | string | null;
  currency: string;
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

export function PortfolioSnapshotEditForm({ snapshot, items }: PortfolioSnapshotEditFormProps) {
  const [rows, setRows] = useState<SnapshotFormRow[]>(
    items.length > 0
      ? items
      : [
          {
            id: "new-0",
            symbol: "",
            market: "US",
            previous_percent: "",
            position_percent: "",
            action_type: "",
            change_reason: "",
            cost_price: "",
            reference_price: "",
            currency: "USD",
            note: "",
          },
        ],
  );
  const [state, formAction] = useActionState(updatePortfolioSnapshot, initialState);

  function addRow() {
    setRows((currentRows) => [
      ...currentRows,
      {
        id: `new-${Date.now()}-${currentRows.length}`,
        symbol: "",
        market: "US",
        previous_percent: "",
        position_percent: "",
        action_type: "",
        change_reason: "",
        cost_price: "",
        reference_price: "",
        currency: "USD",
        note: "",
      },
    ]);
  }

  function removeRow(rowId: string) {
    setRows((currentRows) =>
      currentRows.length === 1 ? currentRows : currentRows.filter((row) => row.id !== rowId),
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
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

            <div className="grid gap-3 md:grid-cols-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">股票代码</span>
                <input
                  name="symbol"
                  type="text"
                  defaultValue={row.symbol}
                  required={index === 0}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">市场</span>
                <input
                  name="market"
                  type="text"
                  defaultValue={row.market}
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
                  defaultValue={row.position_percent}
                  required={index === 0}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

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
                    defaultValue={row.previous_percent ?? ""}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">操作类型</span>
                  <select
                    name="action_type"
                    defaultValue={row.action_type ?? ""}
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
                    defaultValue={row.change_reason ?? ""}
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
                  defaultValue={row.cost_price ?? ""}
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
                  defaultValue={row.reference_price ?? ""}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">货币</span>
                <input
                  name="currency"
                  type="text"
                  defaultValue={row.currency}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <label className="mt-3 block space-y-1">
              <span className="text-sm font-medium">行备注（可选）</span>
              <input
                name="item_note"
                type="text"
                defaultValue={row.note ?? ""}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
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
