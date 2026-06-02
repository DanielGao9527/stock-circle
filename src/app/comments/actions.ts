"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { isCommentTargetType, isVisibleCommentTarget, type CommentTargetType } from "@/lib/comments/data";
import { ensureProfile } from "@/lib/profiles/ensure-profile";
import { createClient } from "@/lib/supabase/server";

export type CommentActionState = {
  error?: string;
  success?: boolean;
  submittedAt?: number;
};

type OwnedCommentRow = {
  id: string;
};

type NotificationTarget = {
  ownerId: string;
  targetTitle: string;
};

type ParentCommentRow = {
  id: string;
  author_id: string;
  target_type: CommentTargetType;
  target_id: string;
};

function normalizeText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

async function getOwnedActiveComment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  commentId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("comments")
    .select("id")
    .eq("id", commentId)
    .eq("author_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as OwnedCommentRow | null;
}

async function getParentComment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentCommentId: string,
) {
  const { data, error } = await supabase
    .from("comments")
    .select("id,author_id,target_type,target_id")
    .eq("id", parentCommentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ParentCommentRow | null;
}

function getCommentSummary(content: string) {
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

async function getNotificationTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: CommentTargetType,
  targetId: string,
) {
  if (targetType === "post") {
    const { data, error } = await supabase
      .from("posts")
      .select("author_id,title,content")
      .eq("id", targetId)
      .is("deleted_at", null)
      .neq("status", "hidden")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const post = data as { author_id: string; title: string | null; content: string };

    return {
      ownerId: post.author_id,
      targetTitle: post.title ?? getCommentSummary(post.content),
    } satisfies NotificationTarget;
  }

  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("owner_id,created_by,title")
    .eq("id", targetId)
    .is("deleted_at", null)
    .neq("status", "hidden")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const snapshot = data as { owner_id: string | null; created_by: string | null; title: string | null };
  const ownerId = snapshot.owner_id ?? snapshot.created_by;

  return ownerId
    ? ({
        ownerId,
        targetTitle: snapshot.title ?? "未命名持仓快照",
      } satisfies NotificationTarget)
    : null;
}

export async function createComment(
  _previousState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const targetTypeValue = normalizeText(formData.get("target_type"));
  const targetId = normalizeText(formData.get("target_id"));
  const content = normalizeText(formData.get("content"));
  const parentCommentId = normalizeText(formData.get("parent_comment_id"));

  if (!targetTypeValue || !isCommentTargetType(targetTypeValue)) {
    return { error: "评论目标无效。" };
  }

  if (!targetId) {
    return { error: "缺少评论目标 ID。" };
  }

  if (!content) {
    return { error: "请输入评论内容。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const visibleTarget = await isVisibleCommentTarget(supabase, targetTypeValue, targetId);

    if (!visibleTarget) {
      return { error: "当前内容不可评论或已不可见。" };
    }

    let parentComment: ParentCommentRow | null = null;

    if (parentCommentId) {
      parentComment = await getParentComment(supabase, parentCommentId);

      if (
        !parentComment ||
        parentComment.target_type !== targetTypeValue ||
        parentComment.target_id !== targetId
      ) {
        return { error: "回复目标不存在，或与当前内容不匹配。" };
      }
    }

    await ensureProfile(supabase, user);

    const { data: createdComment, error } = await supabase
      .from("comments")
      .insert({
        author_id: user.id,
        target_type: targetTypeValue,
        target_id: targetId,
        parent_comment_id: parentCommentId,
        content,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const recipients = new Set<string>();
    const notificationTarget = await getNotificationTarget(supabase, targetTypeValue, targetId);

    if (notificationTarget?.ownerId && notificationTarget.ownerId !== user.id) {
      recipients.add(notificationTarget.ownerId);
    }

    if (parentComment?.author_id && parentComment.author_id !== user.id) {
      recipients.add(parentComment.author_id);
    }

    if (recipients.size > 0) {
      const notificationRows = Array.from(recipients).map((recipientId) => ({
        recipient_id: recipientId,
        actor_id: user.id,
        notification_type: "comment_reply",
        target_type: targetTypeValue,
        target_id: targetId,
        comment_id: (createdComment as { id: string }).id,
        summary: getCommentSummary(content),
      }));

      const { error: notificationError } = await supabase.from("notifications").insert(notificationRows);

      if (notificationError) {
        throw new Error(notificationError.message);
      }
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "评论发布失败，请稍后重试。",
    };
  }

  refresh();

  return {
    success: true,
    submittedAt: Date.now(),
  };
}

export async function deleteComment(formData: FormData) {
  const commentId = normalizeText(formData.get("comment_id"));

  if (!commentId) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const comment = await getOwnedActiveComment(supabase, commentId, user.id);

  if (comment) {
    await supabase
      .from("comments")
      .update({
        deleted_at: new Date().toISOString(),
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("author_id", user.id);
  }

  refresh();
}
