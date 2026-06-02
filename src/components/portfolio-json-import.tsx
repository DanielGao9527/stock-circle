"use client";

import { useActionState, useMemo, useRef, useState } from "react";
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
  asset_type: "stock" | "option";
  option_type: string;
  strike_price: string;
  expiration_date: string;
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
  assetType?: unknown;
  optionType?: unknown;
  strikePrice?: unknown;
  expirationDate?: unknown;
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
  "title": "2026-06-03 持仓调整",
  "note": "根据新一轮仓位计划调整",
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
    },
    {
      "symbol": "NVDA",
      "market": "US",
      "assetType": "option",
      "optionType": "call",
      "strikePrice": 120,
      "expirationDate": "2026-12-18",
      "positionPercent": 8,
      "costPrice": 9.8,
      "currentPrice": 12.1,
      "currency": "USD",
      "changeReason": "用 LEAPS 放大上行弹性",
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
    if (!text) {
      return "";
    }

    const number = Number(text);
    return Number.isFinite(number) && number >= 0 ? text : "";
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

function normalizeAssetType(value: unknown) {
  return toText(value).toLowerCase() === "option" ? "option" : "stock";
}

function normalizeOptionType(value: unknown) {
  const text = toText(value).toLowerCase();
  return text === "call" || text === "put" ? text : "";
}

function normalizeDateInput(value: unknown) {
  const text = toText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizeJsonInput(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const unfenced = fencedMatch ? fencedMatch[1] : trimmed;

  return unfenced
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, '"')
    .trim();
}

function createDraftId(index: number, symbol = "ROW", market = "US") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${symbol}-${market}-${Date.now()}-${index}`;
}

function createEmptyPosition(index: number): ImportPosition {
  return {
    id: createDraftId(index),
    symbol: "",
    market: "US",
    asset_type: "stock",
    option_type: "",
    strike_price: "",
    expiration_date: "",
    previous_percent: "",
    position_percent: "",
    action_type: "",
    cost_price: "",
    reference_price: "",
    currency: "USD",
    change_reason: "",
    note: "",
  };
}

export function PortfolioJsonImport({ latestPositions }: PortfolioJsonImportProps) {
  const nextRowId = useRef(1000);
  const [jsonText, setJsonText] = useState("");
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [parseError, setParseError] = useState("");
  const [state, formAction] = useActionState(createPortfolioSnapshot, initialState);

  const latestPositionMap = useMemo(
    () =>
      latestPositions.reduce((map, item) => {
        map.set(`${item.symbol.toUpperCase()}|${item.market.toUpperCase()}`, item.previousPercent);
        return map;
      }, new Map<string, string>()),
    [latestPositions],
  );

  function buildFallbackPreviousPercent(symbol: string, market: string) {
    return latestPositionMap.get(`${symbol.toUpperCase()}|${market.toUpperCase()}`) ?? "";
  }

  function fillExampleTemplate() {
    setJsonText(exampleJson);
    setDraft(null);
    setParseError("");
  }

  function updateDraftField(field: keyof Omit<ImportDraft, "positions">, value: string) {
    setDraft((currentDraft) => (currentDraft ? { ...currentDraft, [field]: value } : currentDraft));
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

  function addPosition() {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const rowId = nextRowId.current;
      nextRowId.current += 1;

      return {
        ...currentDraft,
        positions: [...currentDraft.positions, createEmptyPosition(rowId)],
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
    const assetType = normalizeAssetType(position.assetType);
    const optionType = normalizeOptionType(position.optionType);
    const strikePrice = toNumberText(position.strikePrice);
    const expirationDate = normalizeDateInput(position.expirationDate);
    const positionPercent = toNumberText(position.positionPercent);

    if (!symbol) {
      return { error: `第 ${index + 1} 条 position 缺少 symbol。` };
    }

    if (!positionPercent) {
      return { error: `第 ${index + 1} 条 position 缺少 positionPercent。` };
    }

    if (assetType === "option" && (!optionType || !strikePrice || !expirationDate)) {
      return { error: `第 ${index + 1} 条期权持仓需要填写 optionType、strikePrice 和 expirationDate。` };
    }

    return {
      id: createDraftId(index, symbol, market),
      symbol,
      market,
      asset_type: assetType,
      option_type: optionType,
      strike_price: strikePrice,
      expiration_date: expirationDate,
      previous_percent:
        toNumberText(position.previousPercent) || buildFallbackPreviousPercent(symbol, market),
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
    const normalizedJsonText = normalizeJsonInput(jsonText);

    if (!normalizedJsonText) {
      setParseError("请先粘贴一段 JSON 再解析。");
      return;
    }

    let parsed: PortfolioSnapshotJson;

    try {
      parsed = JSON.parse(normalizedJsonText) as PortfolioSnapshotJson;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "格式错误";
      setParseError(`JSON 解析失败，请检查逗号、引号、括号，或去掉代码块标记。${detail}`);
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
          把券商文字、截图识别结果或外部工具生成的 JSON 粘贴到这里，先解析成草稿，再保存为持仓快照。
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
          默认不要求 `previousPercent`。如果没提供，系统会尝试用你最近一次持仓快照里的同股票仓位自动回填。现价字段优先读取
          `currentPrice`，旧的 `referencePrice` 也兼容。期权持仓请用
          {" `assetType: \"option\"` "}并补上 `optionType`、`strikePrice`、`expirationDate`。
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
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          支持直接粘贴 ```json 代码块；系统会自动去掉代码块标记和常见中文引号。
        </p>

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">草稿预览</h2>
              <p className="mt-1 text-sm text-zinc-600">
                保存前可以继续调整标题、备注和每一条持仓。
              </p>
            </div>
            <button
              type="button"
              onClick={addPosition}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              添加一行
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium">标题</span>
              <input
                name="title"
                type="text"
                value={draft.title}
                onChange={(event) => updateDraftField("title", event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">备注</span>
              <input
                name="note"
                type="text"
                value={draft.note}
                onChange={(event) => updateDraftField("note", event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="space-y-3">
            {draft.positions.map((position, index) => (
              <div key={position.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
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

                <input type="hidden" name="underlying_symbol" value={position.symbol} />

                <div className="grid gap-3 md:grid-cols-4">
                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-sm font-medium">
                      {position.asset_type === "option" ? "标的代码" : "股票代码"}
                    </span>
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
                    <span className="text-sm font-medium">资产类型</span>
                    <select
                      name="asset_type"
                      value={position.asset_type}
                      onChange={(event) =>
                        updatePosition(
                          position.id,
                          "asset_type",
                          event.target.value === "option" ? "option" : "stock",
                        )
                      }
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="stock">股票</option>
                      <option value="option">期权</option>
                    </select>
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
                    <span className="text-sm font-medium">币种</span>
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
                </div>

                {position.asset_type === "option" ? (
                  <div className="mt-3 grid gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3 md:grid-cols-3">
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">Call / Put</span>
                      <select
                        name="option_type"
                        value={position.option_type}
                        onChange={(event) =>
                          updatePosition(position.id, "option_type", event.target.value)
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
                        value={position.strike_price}
                        onChange={(event) =>
                          updatePosition(position.id, "strike_price", event.target.value)
                        }
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-sm font-medium">到期日</span>
                      <input
                        name="expiration_date"
                        type="date"
                        value={position.expiration_date}
                        onChange={(event) =>
                          updatePosition(position.id, "expiration_date", event.target.value)
                        }
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <input type="hidden" name="option_type" value="" />
                    <input type="hidden" name="strike_price" value="" />
                    <input type="hidden" name="expiration_date" value="" />
                  </>
                )}

                <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                  <span className="text-sm font-medium">条目备注</span>
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
