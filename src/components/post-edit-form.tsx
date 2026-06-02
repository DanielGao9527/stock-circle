"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePost, type PostActionState } from "@/app/posts/actions";
import { postTypeLabels, postTypes, type PostType } from "@/lib/posts/types";

type PostEditFormProps = {
  post: {
    id: string;
    title: string | null;
    content: string;
    post_type: PostType;
    source_url: string | null;
    reference_price: number | string | null;
    reference_currency: string;
  };
  symbols: string[];
};

const initialState: PostActionState = {};

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

export function PostEditForm({ post, symbols }: PostEditFormProps) {
  const [state, formAction] = useActionState(updatePost, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="post_id" value={post.id} />

      <label className="block space-y-1">
        <span className="text-sm font-medium">标题</span>
        <input
          name="title"
          type="text"
          defaultValue={post.title ?? ""}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">内容</span>
        <textarea
          name="content"
          required
          rows={8}
          defaultValue={post.content}
          className="w-full resize-y rounded-xl border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">类型</span>
          <select
            name="post_type"
            required
            defaultValue={post.post_type}
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
          <span className="text-sm font-medium">关联股票</span>
          <input
            name="symbols"
            type="text"
            defaultValue={symbols.join(", ")}
            placeholder="MU, MRVL, NVDA"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">来源链接</span>
        <input
          name="source_url"
          type="url"
          defaultValue={post.source_url ?? ""}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
            defaultValue={post.reference_price ?? ""}
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">参考货币</span>
          <input
            name="reference_currency"
            type="text"
            defaultValue={post.reference_currency}
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
