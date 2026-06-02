"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export async function openNotification(formData: FormData) {
  const notificationId = normalizeText(formData.get("notification_id"));
  const targetType = normalizeText(formData.get("target_type"));
  const targetId = normalizeText(formData.get("target_id"));

  if (!notificationId || !targetType || !targetId) {
    redirect("/notifications");
  }

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
    .eq("id", notificationId)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  revalidatePath("/");

  if (targetType === "post") {
    redirect(`/posts/${targetId}`);
  }

  if (targetType === "snapshot") {
    redirect(`/portfolio/snapshots/${targetId}`);
  }

  redirect("/notifications");
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
