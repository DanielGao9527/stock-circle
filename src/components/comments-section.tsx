"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  createComment,
  deleteComment,
  type CommentActionState,
} from "@/app/comments/actions";
import { type CommentListItem, type CommentTargetType } from "@/lib/comments/data";

type CommentsSectionProps = {
  title?: string;
  targetType: CommentTargetType;
  targetId: string;
  comments: CommentListItem[];
  currentUserId: string;
};

const initialState: CommentActionState = {};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function CommentSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
    >
      {pending ? "发布中..." : "发表评论"}
    </button>
  );
}

function CommentDeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "删除中..." : "删除"}
    </button>
  );
}

export function CommentsSection({
  title = "评论",
  targetType,
  targetId,
  comments,
  currentUserId,
}: CommentsSectionProps) {
  const [state, formAction] = useActionState(createComment, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && state.submittedAt) {
      formRef.current?.reset();
    }
  }, [state.success, state.submittedAt]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>

      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">写评论</span>
          <textarea
            name="content"
            rows={3}
            placeholder="补充你的想法、质疑或观察"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {state.error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <CommentSubmitButton />
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-600">还没有评论，来留下第一条想法吧。</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-xl border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                  <span className="font-medium text-zinc-900">{comment.authorName}</span>
                  <span>·</span>
                  <span>{formatTime(comment.createdAt)}</span>
                </div>
                {comment.authorId === currentUserId ? (
                  <form
                    action={deleteComment}
                    onSubmit={(event) => {
                      if (!window.confirm("确定删除这条评论吗？")) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="comment_id" value={comment.id} />
                    <CommentDeleteButton />
                  </form>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {comment.content}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
