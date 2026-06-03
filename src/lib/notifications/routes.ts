export type NotificationRouteTarget = {
  target_type: string | null;
  target_id: string | null;
  comment_id?: string | null;
};

function withCommentAnchor(path: string, commentId?: string | null) {
  return commentId ? `${path}#comment-${encodeURIComponent(commentId)}` : path;
}

export function getNotificationHref(notification: NotificationRouteTarget) {
  const targetType = notification.target_type;
  const targetId = notification.target_id;

  if (!targetType || !targetId) {
    return null;
  }

  if (targetType === "post") {
    return withCommentAnchor(`/posts/${encodeURIComponent(targetId)}`, notification.comment_id);
  }

  if (targetType === "snapshot" || targetType === "portfolio_snapshot") {
    return withCommentAnchor(
      `/portfolio/snapshots/${encodeURIComponent(targetId)}`,
      notification.comment_id,
    );
  }

  return null;
}

export function getNotificationTargetLabel(targetType: string | null) {
  if (targetType === "post") {
    return "帖子";
  }

  if (targetType === "snapshot" || targetType === "portfolio_snapshot") {
    return "持仓快照";
  }

  return "未知内容";
}
