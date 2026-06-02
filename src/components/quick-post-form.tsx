"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createQuickPost } from "@/app/quick/actions";
import {
  postTypeLabels,
  postTypes,
  type PostType,
  type QuickPostActionState,
} from "@/lib/posts/types";

type QuickMode = "paste" | "ai" | "json" | "manual";

type Draft = {
  title: string;
  content: string;
  post_type: PostType;
  source_url: string;
  symbols: string;
  reference_price: string;
  reference_currency: string;
};

type JsonDraftInput = {
  type?: unknown;
  title?: unknown;
  summary?: unknown;
  content?: unknown;
  symbols?: unknown;
  postType?: unknown;
  sourceUrl?: unknown;
  referencePrice?: unknown;
  referenceCurrency?: unknown;
  tags?: unknown;
};

const initialState: QuickPostActionState = {};

const modeTabs: Array<{ id: QuickMode; label: string; disabled?: boolean }> = [
  { id: "paste", label: "快速粘贴" },
  { id: "ai", label: "AI 解析", disabled: true },
  { id: "json", label: "AI JSON 导入" },
  { id: "manual", label: "高级手动发布" },
];

const emptyDraft: Draft = {
  title: "",
  content: "",
  post_type: "idea",
  source_url: "",
  symbols: "",
  reference_price: "",
  reference_currency: "USD",
};

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalNumberText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return String(value);
  }

  if (typeof value === "string") {
    const text = value.trim();
    const parsed = Number(text);
    return text && Number.isFinite(parsed) && parsed >= 0 ? text : "";
  }

  return "";
}

function isPostType(value: unknown): value is PostType {
  return typeof value === "string" && postTypes.includes(value as PostType);
}

function normalizeSymbols(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).join(", ");
}

function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s，。！？、)）\]}]+/i);
  return match?.[0] ?? "";
}

function detectSymbols(text: string) {
  const textWithoutUrls = text.replace(/https?:\/\/\S+/gi, " ");
  const matches = textWithoutUrls.match(/\b[A-Z]{1,6}(?:\.[A-Z]{1,4})?\b/g) ?? [];
  return Array.from(new Set(matches));
}

function generateTitle(content: string) {
  const chineseChars = content.match(/[\u4e00-\u9fff]/g);

  if (chineseChars && chineseChars.length > 0) {
    return chineseChars.slice(0, 30).join("");
  }

  const firstSentence = content
    .split(/[\n。！？.!?]/)
    .map((part) => part.trim())
    .find(Boolean);

  return firstSentence ? firstSentence.slice(0, 80) : "";
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 md:w-auto"
    >
      {pending ? "发布中..." : "发布"}
    </button>
  );
}

function DraftPreview({
  draft,
  actionState,
  formAction,
  draftVersion,
}: {
  draft: Draft | null;
  actionState: QuickPostActionState;
  formAction: (payload: FormData) => void;
  draftVersion: number;
}) {
  if (!draft) {
    return null;
  }

  return (
    <form
      key={draftVersion}
      action={formAction}
      className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-5"
    >
      <div>
        <h2 className="text-lg font-semibold">草稿预览</h2>
        <p className="mt-1 text-sm text-zinc-600">发布前可以继续编辑这些字段。</p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">标题</span>
        <input
          name="title"
          type="text"
          defaultValue={draft.title}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">内容</span>
        <textarea
          name="content"
          required
          rows={6}
          defaultValue={draft.content}
          className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">类型</span>
          <select
            name="post_type"
            required
            defaultValue={draft.post_type}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {postTypes.map((type) => (
              <option key={type} value={type}>
                {postTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">股票代码</span>
          <input
            name="symbols"
            type="text"
            defaultValue={draft.symbols}
            placeholder="MU, MRVL, NVDA"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">来源链接</span>
        <input
          name="source_url"
          type="url"
          defaultValue={draft.source_url}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">参考价格</span>
          <input
            name="reference_price"
            type="number"
            min="0"
            step="0.000001"
            defaultValue={draft.reference_price}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">参考货币</span>
          <input
            name="reference_currency"
            type="text"
            defaultValue={draft.reference_currency}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <input type="hidden" name="market" value="US" />

      {actionState.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionState.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function QuickPasteMode({
  onDraft,
}: {
  onDraft: (draft: Draft) => void;
}) {
  const [rawText, setRawText] = useState("");
  const [manualSymbols, setManualSymbols] = useState("");
  const [selectedType, setSelectedType] = useState<"" | PostType>("");
  const [error, setError] = useState("");

  function handleGenerateDraft() {
    const content = rawText.trim();

    if (!content) {
      setError("请先粘贴或输入一些内容。");
      return;
    }

    const sourceUrl = extractFirstUrl(content);
    const detectedSymbols = detectSymbols(content);
    const symbols = normalizeSymbols([manualSymbols, detectedSymbols.join(",")].filter(Boolean).join(","));

    setError("");
    onDraft({
      ...emptyDraft,
      title: generateTitle(content),
      content,
      post_type: selectedType || (sourceUrl ? "link" : "idea"),
      source_url: sourceUrl,
      symbols,
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">快速粘贴</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          先把有价值的信息保存下来，系统只做轻量本地解析，不判断情绪、方向或投资含义。
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">内容</span>
        <textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          rows={9}
          placeholder="粘贴推文链接、文章链接、截图识别文字、群聊观点，或你自己的一句话。"
          className="w-full resize-y rounded-xl border border-zinc-300 px-3 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">股票代码（可选）</span>
          <input
            value={manualSymbols}
            onChange={(event) => setManualSymbols(event.target.value)}
            type="text"
            placeholder="MU, MRVL, NVDA"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">类型（可选）</span>
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value as "" | PostType)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">自动判断</option>
            {postTypes.map((type) => (
              <option key={type} value={type}>
                {postTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleGenerateDraft}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 md:w-auto"
      >
        生成草稿
      </button>
    </div>
  );
}

function AiComingSoonMode() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 shadow-sm">
      <div className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
        Coming Soon
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">AI 解析</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        未来可以直接粘贴推文、文章、聊天记录或持仓文字，系统会自动调用 AI 生成结构化草稿。
      </p>
      <p className="mt-3 text-sm text-zinc-500">当前版本不会调用任何 AI API。</p>
    </div>
  );
}

function symbolsFromJson(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeSymbols(value.map((item) => String(item)).join(","));
  }

  if (typeof value === "string") {
    return normalizeSymbols(value);
  }

  return "";
}

function AiJsonImportMode({
  onDraft,
}: {
  onDraft: (draft: Draft) => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");

  function handleParseJson() {
    let parsed: JsonDraftInput;

    try {
      parsed = JSON.parse(jsonText) as JsonDraftInput;
    } catch {
      setError("JSON 格式无效，请检查逗号、引号和括号。");
      return;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setError("JSON 顶层必须是一个对象。");
      return;
    }

    if (parsed.type !== undefined && parsed.type !== "post") {
      setError('type 字段如果存在，必须是 "post"。');
      return;
    }

    const postType = isPostType(parsed.postType) ? parsed.postType : "idea";
    const content = toText(parsed.content) || toText(parsed.summary);

    if (!content) {
      setError("JSON 中至少需要 content 或 summary。");
      return;
    }

    setError("");
    onDraft({
      title: toText(parsed.title) || generateTitle(content),
      content,
      post_type: postType,
      source_url: toText(parsed.sourceUrl),
      symbols: symbolsFromJson(parsed.symbols),
      reference_price: toOptionalNumberText(parsed.referencePrice),
      reference_currency: toText(parsed.referenceCurrency).toUpperCase() || "USD",
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI JSON 导入</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          粘贴外部 AI 生成的 JSON，本页只在本地解析并生成可编辑草稿。
        </p>
      </div>

      <textarea
        value={jsonText}
        onChange={(event) => setJsonText(event.target.value)}
        rows={12}
        placeholder={`{\n  "type": "post",\n  "title": "示例标题",\n  "content": "示例内容",\n  "symbols": ["NVDA"],\n  "postType": "idea"\n}`}
        className="w-full resize-y rounded-xl border border-zinc-300 px-3 py-3 font-mono text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleParseJson}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 md:w-auto"
      >
        解析为草稿
      </button>
    </div>
  );
}

function AdvancedManualMode({
  actionState,
  formAction,
}: {
  actionState: QuickPostActionState;
  formAction: (payload: FormData) => void;
}) {
  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">高级手动发布</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          适合需要明确填写来源、类型、参考价格等字段的正式记录。
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">标题（可选）</span>
        <input
          name="title"
          type="text"
          placeholder="例如：英伟达财报后的几个观察"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">内容</span>
        <textarea
          name="content"
          required
          rows={7}
          placeholder="写下你的想法、链接摘要、新闻重点或复盘记录..."
          className="w-full resize-y rounded-xl border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">类型</span>
          <select
            name="post_type"
            required
            defaultValue="idea"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {postTypes.map((type) => (
              <option key={type} value={type}>
                {postTypeLabels[type]}
              </option>
            ))}
          </select>
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
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">股票代码（可选）</span>
        <input
          name="symbols"
          type="text"
          placeholder="例如：MU, MRVL, NVDA"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">来源链接（可选）</span>
        <input
          name="source_url"
          type="url"
          placeholder="https://example.com/news"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">参考价格（可选）</span>
          <input
            name="reference_price"
            type="number"
            min="0"
            step="0.000001"
            placeholder="例如：128.5"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">参考货币</span>
          <input
            name="reference_currency"
            type="text"
            defaultValue="USD"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {actionState.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionState.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

export function QuickPostForm() {
  const [state, formAction] = useActionState(createQuickPost, initialState);
  const [activeMode, setActiveMode] = useState<QuickMode>("paste");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);

  function handleDraft(nextDraft: Draft) {
    setDraft(nextDraft);
    setDraftVersion((version) => version + 1);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">发布</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          用最少步骤保存股票相关想法、链接、新闻、复盘或短笔记。
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {modeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => {
                if (!tab.disabled) {
                  setActiveMode(tab.id);
                }
              }}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                activeMode === tab.id
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              } disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3">
          <div className="text-sm font-medium text-zinc-700">AI 解析 · Coming Soon</div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            未来可以直接粘贴推文、文章、聊天记录或持仓文字，系统会自动调用 AI
            生成结构化草稿。当前版本不会调用任何 AI API。
          </p>
        </div>
      </div>

      {activeMode === "paste" ? <QuickPasteMode onDraft={handleDraft} /> : null}
      {activeMode === "ai" ? <AiComingSoonMode /> : null}
      {activeMode === "json" ? <AiJsonImportMode onDraft={handleDraft} /> : null}
      {activeMode === "manual" ? (
        <AdvancedManualMode actionState={state} formAction={formAction} />
      ) : null}

      {activeMode !== "manual" ? (
        <DraftPreview
          draft={draft}
          actionState={state}
          formAction={formAction}
          draftVersion={draftVersion}
        />
      ) : null}
    </section>
  );
}
