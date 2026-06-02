"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { CopyTextButton } from "@/components/copy-text-button";
import {
  createPortfolioSnapshot,
  type PortfolioSnapshotActionState,
} from "@/app/portfolio/actions";

type ImportPosition = {
  id: string;
  symbol: string;
  market: string;
  previous_percent: string;
  position_percent: string;
  action_type: string;
  cost_price: string;
  reference_price: string;
  currency: string;
  change_reason: string;
  note: string;
};

type ImportDraft = {
  title: string;
  note: string;
  positions: ImportPosition[];
};

type PortfolioSnapshotJson = {
  type?: unknown;
  title?: unknown;
  note?: unknown;
  positions?: unknown;
};

type PositionJson = {
  symbol?: unknown;
  market?: unknown;
  previousPercent?: unknown;
  positionPercent?: unknown;
  actionType?: unknown;
  costPrice?: unknown;
  currentPrice?: unknown;
  referencePrice?: unknown;
  currency?: unknown;
  changeReason?: unknown;
  note?: unknown;
};

type LatestPositionSeed = {
  symbol: string;
  market: string;
  previousPercent: string;
};

type PortfolioJsonImportProps = {
  latestPositions: LatestPositionSeed[];
};

const initialState: PortfolioSnapshotActionState = {};

const actionTypeOptions = [
  { value: "", label: "自动推断" },
  { value: "new", label: "新建" },
  { value: "increase", label: "加仓" },
  { value: "reduce", label: "减仓" },
  { value: "hold", label: "持有不变" },
  { value: "clear", label: "清仓" },
];

const exampleJson = `{
  "type": "portfolio_snapshot",
  "title": "2026-06-02 持仓调整",
  "note": "",
  "positions": [
    {
      "symbol": "MU",
      "market": "US",
      "positionPercent": 30,
      "actionType": "increase",
      "costPrice": 85.2,
      "currentPrice": 112.5,
      "currency": "USD",
      "changeReason": "HBM 逻辑继续强化",
      "note": ""
    }
  ]
}`;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 md:w-auto"
    >
      {pending ? "保存中..." : "保存为持仓快照"}
    </button>
  );
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumberText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return String(value);
  }

  if (typeof value === "string") {
    const text = value.trim();
    const number = Number(text);
    return text && Number.isFinite(number) && number >= 0 ? text : "";
  }

  return "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeActionType(value: unknown) {
  const text = toText(value);
  return actionTypeOptions.some((option) => option.value === text) ? text : "";
}

function createDraftId(symbol: string, market: string, index: number) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${symbol}-${market}-${Date.now()}-${index}`;
}

export function PortfolioJsonImport({ latestPositions }: PortfolioJsonImportProps) {
  const [jsonText, setJsonText] = useState("");
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [parseError, setParseError] = useState("");
  const [state, formAction] = useActionState(createPortfolioSnapshot, initialState);
  const latestPositionMap = useMemo(
    () =>
      latestPositions.reduce((map, item) => {
        map.set(`${item.symbol}|${item.market}`, item.previousPercent);
        return map;
      }, new Map<string, string>()),
    [latestPositions],
  );

  function fillExampleTemplate() {
    setJsonText(exampleJson);
    setDraft(null);
    setParseError("");
  }

  function updatePosition(rowId: string, field: keyof ImportPosition, value: string) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        positions: currentDraft.positions.map((position) =>
          position.id === rowId ? { ...position, [field]: value } : position,
        ),
      };
    });
  }

  function removePosition(rowId: string) {
    setDraft((currentDraft) => {
      if (!currentDraft || currentDraft.positions.length === 1) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        positions: currentDraft.positions.filter((position) => position.id !== rowId),
      };
    });
  }

  function normalizePosition(value: unknown, index: number): ImportPosition | { error: string } {
    if (!isObject(value)) {
      return { error: `第 ${index + 1} 条 position 必须是对象。` };
    }

    const position = value as PositionJson;
    const symbol = toText(position.symbol).toUpperCase();
    const market = toText(position.market).toUpperCase() || "US";
    const positionPercent = toNumberText(position.positionPercent);

    if (!symbol) {
      return { error: `第 ${index + 1} 条 position 缺少 symbol。` };
    }

    if (!positionPercent) {
      return { error: `第 ${index + 1} 条 position 缺少 positionPercent。` };
    }

    const fallbackPreviousPercent = latestPositionMap.get(`${symbol}|${market}`) ?? "";

    return {
      id: createDraftId(symbol, market, index),
      symbol,
      market,
      previous_percent: toNumberText(position.previousPercent) || fallbackPreviousPercent,
      position_percent: positionPercent,
      action_type: normalizeActionType(position.actionType),
      cost_price: toNumberText(position.costPrice),
      reference_price: toNumberText(position.currentPrice) || toNumberText(position.referencePrice),
      currency: toText(position.currency).toUpperCase() || "USD",
      change_reason: toText(position.changeReason),
      note: toText(position.note),
    };
  }

  function handleParseJson() {
    let parsed: PortfolioSnapshotJson;

    try {
      parsed = JSON.parse(jsonText) as PortfolioSnapshotJson;
    } catch {
      setParseError("JSON 格式无效，请检查逗号、引号和括号。");
      return;
    }

    if (!isObject(parsed)) {
      setParseError("JSON 顶层必须是一个对象。");
      return;
    }

    if (parsed.type !== undefined && parsed.type !== "portfolio_snapshot") {
      setParseError('type 字段如果存在，必须是 "portfolio_snapshot"。');
      return;
    }

    if (!Array.isArray(parsed.positions)) {
      setParseError("positions 必须是数组。");
      return;
    }

    if (parsed.positions.length === 0) {
      setParseError("positions 至少需要一条持仓记录。");
      return;
    }

    const positions: ImportPosition[] = [];

    for (const [index, position] of parsed.positions.entries()) {
      const normalized = normalizePosition(position, index);

      if ("error" in normalized) {
        setParseError(normalized.error);
        return;
      }

      positions.push(normalized);
    }

    setParseError("");
    setDraft({
      title: toText(parsed.title),
      note: toText(parsed.note),
      positions,
    });
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">组合 JSON 导入</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          把券商文字、截图识别文字或聊天记录交给外部工具生成 StockCircle JSON，再粘贴到这里。这里不会调用任何 AI API。
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">JSON 模板</h2>
          <div className="flex flex-wrap gap-2">
            <CopyTextButton
              text={exampleJson}
              idleLabel="复制模板"
              successLabel="模板已复制"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
            />
            <button
              type="button"
              onClick={fillExampleTemplate}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              填入模板
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          模板默认不要求 `previousPercent`。如果你没有提供它，系统会尝试用你最近一次持仓快照里同股票的当前仓位自动回填到草稿里。
        </p>
        <pre className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm leading-6 text-zinc-800">
          {exampleJson}
        </pre>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">粘贴 JSON</h2>
        <textarea
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          rows={14}
          placeholder={exampleJson}
          className="mt-3 w-full resize-y rounded-xl border border-zinc-300 px-3 py-3 font-mono text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {parseError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {parseError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleParseJson}
          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 md:w-auto"
        >
          解析为草稿
        </button>
      </div>

      {draft ? (
        <form
          action={formAction}
          className="space-y-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-5"
        >
          <div>
            <h2 className="text-lg font-semibold">草稿预览</h2>
            <p className="mt-1 text-sm text-zinc-600">
              保存前可以编辑标题、备注和每一行持仓变化。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium">标题</span>
              <input
                name="title"
                type="text"
                value={draft.title}
                onChange={(event) =>
                  setDraft((currentDraft) =>
                    currentDraft ? { ...currentDraft, title: event.target.value } : currentDraft,
                  )
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">备注</span>
              <input
                name="note"
                type="text"
                value={draft.note}
                onChange={(event) =>
                  setDraft((currentDraft) =>
                    currentDraft ? { ...currentDraft, note: event.target.value } : currentDraft,
                  )
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="space-y-3">
            {draft.positions.map((position, index) => (
              <div key={position.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium">第 {index + 1} 行</span>
                  <button
                    type="button"
                    onClick={() => removePosition(position.id)}
                    disabled={draft.positions.length === 1}
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
                      required
                      value={position.symbol}
                      onChange={(event) =>
                        updatePosition(position.id, "symbol", event.target.value.toUpperCase())
                      }
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium">市场</span>
                    <input
                      name="market"
                      type="text"
                      value={position.market}
                      onChange={(event) =>
                        updatePosition(position.id, "market", event.target.value.toUpperCase())
                      }
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
                      required
                      value={position.position_percent}
                      onChange={(event) =>
                        updatePosition(position.id, "position_percent", event.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium">上一仓位 %</span>
                    <input
                      name="previous_percent"
                      type="number"
                      min="0"
                      step="0.0001"
                      value={position.previous_percent}
                      onChange={(event) =>
                        updatePosition(position.id, "previous_percent", event.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium">操作类型</span>
                    <select
                      name="action_type"
                      value={position.action_type}
                      onChange={(event) =>
                        updatePosition(position.id, "action_type", event.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {actionTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium">货币</span>
                    <input
                      name="currency"
                      type="text"
                      value={position.currency}
                      onChange={(event) =>
                        updatePosition(position.id, "currency", event.target.value.toUpperCase())
                      }
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium">成本价</span>
                    <input
                      name="cost_price"
                      type="number"
                      min="0"
                      step="0.000001"
                      value={position.cost_price}
                      onChange={(event) =>
                        updatePosition(position.id, "cost_price", event.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium">现价</span>
                    <input
                      name="reference_price"
                      type="number"
                      min="0"
                      step="0.000001"
                      value={position.reference_price}
                      onChange={(event) =>
                        updatePosition(position.id, "reference_price", event.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium">变化原因</span>
                    <input
                      name="change_reason"
                      type="text"
                      value={position.change_reason}
                      onChange={(event) =>
                        updatePosition(position.id, "change_reason", event.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>

                <label className="mt-3 block space-y-1">
                  <span className="text-sm font-medium">备注</span>
                  <input
                    name="item_note"
                    type="text"
                    value={position.note}
                    onChange={(event) => updatePosition(position.id, "note", event.target.value)}
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
      ) : null}
    </section>
  );
}
