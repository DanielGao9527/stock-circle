"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
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

type CommentNode = CommentListItem & {
  children: CommentNode[];
};

const initialState: CommentActionState = {};
const MAX_INDENT_DEPTH = 2;

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function CommentSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
    >
      {pending ? "提交中..." : label}
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

function buildCommentTree(comments: CommentListItem[]) {
  const nodeMap = new Map<string, CommentNode>();

  comments.forEach((comment) => {
    nodeMap.set(comment.id, { ...comment, children: [] });
  });

  const roots: CommentNode[] = [];

  comments.forEach((comment) => {
    const node = nodeMap.get(comment.id);

    if (!node) {
      return;
    }

    if (comment.parentCommentId) {
      const parentNode = nodeMap.get(comment.parentCommentId);

      if (parentNode) {
        parentNode.children.push(node);
        return;
      }
    }

    roots.push(node);
  });

  return roots;
}

function indentClassName(depth: number) {
  const safeDepth = Math.min(depth, MAX_INDENT_DEPTH);

  if (safeDepth <= 0) {
    return "";
  }

  if (safeDepth === 1) {
    return "ml-3 border-l border-zinc-200 pl-3 sm:ml-4 sm:pl-4";
  }

  return "ml-4 border-l border-zinc-200 pl-3 sm:ml-6 sm:pl-4";
}

function CommentComposer({
  targetType,
  targetId,
  parentCommentId,
  onSubmitted,
  compact = false,
}: {
  targetType: CommentTargetType;
  targetId: string;
  parentCommentId?: string | null;
  onSubmitted?: () => void;
  compact?: boolean;
}) {
  const [state, formAction] = useActionState(createComment, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && state.submittedAt) {
      formRef.current?.reset();
      onSubmitted?.();
    }
  }, [onSubmitted, state.success, state.submittedAt]);

  return (
    <form ref={formRef} action={formAction} className={compact ? "space-y-3" : "space-y-3"}>
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="parent_comment_id" value={parentCommentId ?? ""} />

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">
          {parentCommentId ? "写回复" : "写评论"}
        </span>
        <textarea
          name="content"
          rows={compact ? 2 : 3}
          placeholder={parentCommentId ? "回复这条评论" : "补充你的想法、质疑或观察"}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <CommentSubmitButton label={parentCommentId ? "发表回复" : "发表评论"} />
      </div>
    </form>
  );
}

function CommentItem({
  node,
  depth,
  targetType,
  targetId,
  currentUserId,
}: {
  node: CommentNode;
  depth: number;
  targetType: CommentTargetType;
  targetId: string;
  currentUserId: string;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div className={indentClassName(depth)}>
      <article id={`comment-${node.id}`} className="scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span className="font-medium text-zinc-900">{node.authorName}</span>
            <span>·</span>
            <span>{formatTime(node.createdAt)}</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              {depth === 0 ? "主评论" : "回复"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!node.isDeleted ? (
              <button
                type="button"
                onClick={() => setReplying((value) => !value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
              >
                {replying ? "取消回复" : "回复"}
              </button>
            ) : null}

            {node.authorId === currentUserId && !node.isDeleted ? (
              <form
                action={deleteComment}
                onSubmit={(event) => {
                  if (!window.confirm("确定删除这条评论吗？")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="comment_id" value={node.id} />
                <CommentDeleteButton />
              </form>
            ) : null}
          </div>
        </div>

        {node.isDeleted ? (
          <p className="mt-3 text-sm italic leading-6 text-zinc-500">该评论已删除</p>
        ) : (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">
            {node.content}
          </p>
        )}

        {replying ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <CommentComposer
              targetType={targetType}
              targetId={targetId}
              parentCommentId={node.id}
              compact
              onSubmitted={() => setReplying(false)}
            />
          </div>
        ) : null}
      </article>

      {node.children.length > 0 ? (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              depth={depth + 1}
              targetType={targetType}
              targetId={targetId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CommentsSection({
  title = "评论",
  targetType,
  targetId,
  comments,
  currentUserId,
}: CommentsSectionProps) {
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="mt-4">
        <CommentComposer targetType={targetType} targetId={targetId} />
      </div>

      <div className="mt-6 space-y-3">
        {commentTree.length === 0 ? (
          <p className="text-sm text-zinc-600">还没有评论，来留下第一条想法吧。</p>
        ) : (
          commentTree.map((comment) => (
            <CommentItem
              key={comment.id}
              node={comment}
              depth={0}
              targetType={targetType}
              targetId={targetId}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </section>
  );
}
