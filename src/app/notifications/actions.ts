"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isVisibleCommentTarget, type CommentTargetType } from "@/lib/comments/data";
import { getNotificationHref } from "@/lib/notifications/routes";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export async function openNotification(formData: FormData) {
  const notificationId = normalizeText(formData.get("notification_id"));

  if (!notificationId) {
    redirect("/notifications");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .select("id,target_type,target_id,comment_id")
    .eq("id", notificationId)
    .eq("recipient_id", user.id)
    .maybeSingle();

  if (notificationError || !notification) {
    redirect("/notifications?error=notification_missing");
  }

  const targetType =
    notification.target_type === "portfolio_snapshot" ? "snapshot" : notification.target_type;

  if (targetType !== "post" && targetType !== "snapshot") {
    redirect("/notifications?error=target_missing");
  }

  const targetVisible = await isVisibleCommentTarget(
    supabase,
    targetType as CommentTargetType,
    notification.target_id,
  );

  if (!targetVisible) {
    redirect("/notifications?error=target_missing");
  }

  const href = getNotificationHref(notification);

  if (!href) {
    redirect("/notifications?error=target_missing");
  }

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  revalidatePath("/");

  redirect(href);
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  revalidatePath("/");
}
