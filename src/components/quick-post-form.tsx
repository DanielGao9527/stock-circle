"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createQuickPost } from "@/app/quick/actions";
import { postTypeLabels, postTypes } from "@/lib/posts/types";

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
      {pending ? "发布中..." : "发布"}
    </button>
  );
}

export function QuickPostForm() {
  const [state, formAction] = useActionState(createQuickPost, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">快速发布</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          记录股票想法、外部链接、新闻、复盘或普通笔记，可关联一个或多个股票代码。
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
