"use client";

import { useFormStatus } from "react-dom";
import { deletePost } from "@/app/posts/actions";

type PostDeleteButtonProps = {
  postId: string;
};

function DeleteSubmitButton() {
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

export function PostDeleteButton({ postId }: PostDeleteButtonProps) {
  return (
    <form
      action={deletePost}
      onSubmit={(event) => {
        if (!window.confirm("确定要删除这条帖子吗？删除后默认不再显示。")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="post_id" value={postId} />
      <DeleteSubmitButton />
    </form>
  );
}
