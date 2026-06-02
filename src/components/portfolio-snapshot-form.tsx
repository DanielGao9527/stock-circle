"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPortfolioSnapshot } from "@/app/portfolio/actions";

type PortfolioRow = {
  id: number;
  asset_type: "stock" | "option";
};

const initialState = {
  error: undefined,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 md:w-auto"
    >
      {pending ? "保存中..." : "保存快照"}
    </button>
  );
}

export function PortfolioSnapshotForm() {
  const nextRowId = useRef(2);
  const [rows, setRows] = useState<PortfolioRow[]>([{ id: 1, asset_type: "stock" }]);
  const [state, formAction] = useActionState(createPortfolioSnapshot, initialState);

  function addRow() {
    const rowId = nextRowId.current;
    nextRowId.current += 1;
    setRows((currentRows) => [...currentRows, { id: rowId, asset_type: "stock" }]);
  }

  function removeRow(rowId: number) {
    setRows((currentRows) =>
      currentRows.length === 1 ? currentRows : currentRows.filter((row) => row.id !== rowId),
    );
  }

  function updateAssetType(rowId: number, assetType: "stock" | "option") {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, asset_type: assetType } : row)),
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold tracking-tight">新建持仓快照</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          记录当前组合配置。股票和期权都可以放在同一份快照里，方便回看仓位变化。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">标题（可选）</span>
          <input
            name="title"
            type="text"
            placeholder="例如：2026 年 6 月组合"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">备注（可选）</span>
          <input
            name="note"
            type="text"
            placeholder="例如：提高进攻性，增加期权权重"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-medium">持仓明细</h3>
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
                  value={row.asset_type}
                  onChange={(event) =>
                    updateAssetType(
                      row.id,
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
                  placeholder={row.asset_type === "option" ? "NVDA" : "NVDA"}
                  required={index === 0}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">市场</span>
                <input
                  name="market"
                  type="text"
                  defaultValue="US"
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
                  placeholder="25"
                  required={index === 0 && row.asset_type !== "option"}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            {row.asset_type === "option" ? (
              <div className="mt-3 grid gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3 md:grid-cols-4">
                <input type="hidden" name="underlying_symbol" value="" />
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Call / Put</span>
                  <select
                    name="option_type"
                    defaultValue="call"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
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
                    placeholder="120"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">到期日</span>
                  <input
                    name="expiration_date"
                    type="date"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">买卖方向</span>
                  <select
                    name="option_side"
                    defaultValue=""
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
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            ) : (
              <>
                <input type="hidden" name="underlying_symbol" value="" />
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
                    placeholder="例如：20"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">操作类型</span>
                  <select
                    name="action_type"
                    defaultValue=""
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
                    placeholder="例如：财报后提高权重"
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
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">币种</span>
                <input
                  name="currency"
                  type="text"
                  defaultValue="USD"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <label className="mt-3 block space-y-1">
              <span className="text-sm font-medium">行备注（可选）</span>
              <input
                name="item_note"
                type="text"
                placeholder="例如：短线事件仓 / 长期 LEAPS"
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
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">风险说明</span>
                  <input
                    name="risk_note"
                    type="text"
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
