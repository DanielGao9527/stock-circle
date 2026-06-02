import { createClient } from "@/lib/supabase/server";

export const DAILY_DIGEST_TIME = "us_market_open_minus_10m";

export type NotificationPreference = {
  userId: string;
  dailyEmailEnabled: boolean;
  digestEmail: string;
  digestTime: typeof DAILY_DIGEST_TIME;
};

type PreferenceRow = {
  user_id: string;
  daily_email_enabled: boolean | null;
  digest_email: string | null;
  digest_time: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getNotificationPreference(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("user_id,daily_email_enabled,digest_email,digest_time")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      userId,
      dailyEmailEnabled: false,
      digestEmail: "",
      digestTime: DAILY_DIGEST_TIME,
    } satisfies NotificationPreference;
  }

  const row = data as PreferenceRow;

  return {
    userId: row.user_id,
    dailyEmailEnabled: Boolean(row.daily_email_enabled),
    digestEmail: row.digest_email ?? "",
    digestTime:
      row.digest_time === DAILY_DIGEST_TIME ? DAILY_DIGEST_TIME : DAILY_DIGEST_TIME,
  } satisfies NotificationPreference;
}
