import { createClient } from "@/lib/supabase/server";
import { getNotificationHref, getNotificationTargetLabel } from "@/lib/notifications/routes";

export type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string;
  notification_type: string;
  target_type: string;
  target_id: string;
  comment_id: string | null;
  summary: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationListItem = NotificationRow & {
  actorName: string;
  targetTitle: string;
  targetLabel: string;
  targetAvailable: boolean;
  href: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ProfileRow = {
  id: string;
  display_name: string;
};

type PostTargetRow = {
  id: string;
  title: string | null;
  content: string;
};

type SnapshotTargetRow = {
  id: string;
  title: string | null;
};

const NOTIFICATIONS_LIMIT = 10;

function getPreview(value: string) {
  return value.length > 60 ? `${value.slice(0, 60)}...` : value;
}

function isSnapshotTargetType(value: string) {
  return value === "snapshot" || value === "portfolio_snapshot";
}

export async function getUnreadNotificationCount(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getNotificationsForUser(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id,recipient_id,actor_id,notification_type,target_type,target_id,comment_id,summary,read_at,created_at",
    )
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const notifications = (data ?? []) as NotificationRow[];
  const actorIds = Array.from(new Set(notifications.map((notification) => notification.actor_id)));
  const postIds = Array.from(
    new Set(
      notifications
        .filter((notification) => notification.target_type === "post")
        .map((notification) => notification.target_id),
    ),
  );
  const snapshotIds = Array.from(
    new Set(
      notifications
        .filter((notification) => isSnapshotTargetType(notification.target_type))
        .map((notification) => notification.target_id),
    ),
  );

  let actorNames = new Map<string, string>();
  let postTitles = new Map<string, string>();
  let snapshotTitles = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", actorIds);

    if (profileError) {
      throw new Error(profileError.message);
    }

    actorNames = new Map(
      ((profileData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.display_name]),
    );
  }

  if (postIds.length > 0) {
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id,title,content")
      .in("id", postIds)
      .is("deleted_at", null)
      .neq("status", "hidden");

    if (postError) {
      throw new Error(postError.message);
    }

    postTitles = new Map(
      ((postData ?? []) as PostTargetRow[]).map((post) => [
        post.id,
        post.title ?? getPreview(post.content),
      ]),
    );
  }

  if (snapshotIds.length > 0) {
    const { data: snapshotData, error: snapshotError } = await supabase
      .from("portfolio_snapshots")
      .select("id,title")
      .in("id", snapshotIds)
      .is("deleted_at", null)
      .neq("status", "hidden");

    if (snapshotError) {
      throw new Error(snapshotError.message);
    }

    snapshotTitles = new Map(
      ((snapshotData ?? []) as SnapshotTargetRow[]).map((snapshot) => [
        snapshot.id,
        snapshot.title ?? "未命名持仓快照",
      ]),
    );
  }

  return notifications.map((notification) => {
    const href = getNotificationHref(notification);
    const targetLabel = getNotificationTargetLabel(notification.target_type);
    const targetTitle =
      notification.target_type === "post"
        ? postTitles.get(notification.target_id)
        : isSnapshotTargetType(notification.target_type)
          ? snapshotTitles.get(notification.target_id)
          : null;

    return {
      ...notification,
      actorName:
        actorNames.get(notification.actor_id) ?? `成员 ${notification.actor_id.slice(0, 8)}`,
      targetTitle: targetTitle ?? `${targetLabel}已删除或不可见`,
      targetLabel,
      targetAvailable: Boolean(href && targetTitle),
      href,
    };
  }) satisfies NotificationListItem[];
}
