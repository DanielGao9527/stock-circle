"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DAILY_DIGEST_TIME } from "@/lib/notifications/preferences";
import { createClient } from "@/lib/supabase/server";

export type DailyDigestPreferenceActionState = {
  error?: string;
  success?: boolean;
};

function normalizeText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function saveDailyDigestPreference(
  _previousState: DailyDigestPreferenceActionState,
  formData: FormData,
): Promise<DailyDigestPreferenceActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const dailyEmailEnabled = formData.get("daily_email_enabled") === "on";
  const digestEmail = normalizeText(formData.get("digest_email"));

  if (digestEmail && !isValidEmail(digestEmail)) {
    return { error: "请输入有效的接收邮箱。" };
  }

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      daily_email_enabled: dailyEmailEnabled,
      digest_email: digestEmail || null,
      digest_time: DAILY_DIGEST_TIME,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/me");

  return { success: true };
}
