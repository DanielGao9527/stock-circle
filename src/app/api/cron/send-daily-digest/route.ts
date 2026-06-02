import { NextResponse } from "next/server";
import { sendDailyDigestEmail } from "@/lib/email/resend";
import { DAILY_DIGEST_TIME } from "@/lib/notifications/preferences";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDailyDigest } from "@/lib/digest/generate-daily-digest";

type PreferenceRow = {
  user_id: string;
  digest_email: string | null;
};

type DigestLogRow = {
  status: string;
};

type NewYorkTimeParts = {
  date: string;
  hour: number;
  minute: number;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeAuthorizationHeader(header: string | null) {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

function getNewYorkTimeParts(date = new Date()): NewYorkTimeParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
  };
}

function isInsideDigestWindow(parts: NewYorkTimeParts) {
  const minuteOfDay = parts.hour * 60 + parts.minute;
  const startMinute = 9 * 60 + 15;
  const endMinute = 9 * 60 + 25;
  return minuteOfDay >= startMinute && minuteOfDay <= endMinute;
}

async function handleSendDailyDigest(request: Request) {
  const providedSecret = normalizeAuthorizationHeader(request.headers.get("authorization"));
  const expectedSecret = getRequiredEnv("CRON_SECRET");

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nyTime = getNewYorkTimeParts(new Date());

  if (!isInsideDigestWindow(nyTime)) {
    return NextResponse.json({
      skipped: true,
      reason: "outside_market_open_digest_window",
      nyDate: nyTime.date,
      nyTime: `${String(nyTime.hour).padStart(2, "0")}:${String(nyTime.minute).padStart(2, "0")}`,
    });
  }

  const supabase = createAdminClient();
  const { data: preferenceData, error: preferenceError } = await supabase
    .from("notification_preferences")
    .select("user_id,digest_email")
    .eq("daily_email_enabled", true)
    .eq("digest_time", DAILY_DIGEST_TIME);

  if (preferenceError) {
    throw new Error(preferenceError.message);
  }

  const preferences = (preferenceData ?? []) as PreferenceRow[];
  const digest = await generateDailyDigest({ supabase });
  const subject = `持仓圈开盘前摘要 - ${nyTime.date}`;

  const results: Array<{
    userId: string;
    email?: string;
    status: "sent" | "failed" | "skipped";
    reason?: string;
  }> = [];

  for (const preference of preferences) {
    const { data: existingLog, error: existingLogError } = await supabase
      .from("email_digest_logs")
      .select("status")
      .eq("user_id", preference.user_id)
      .eq("digest_date", nyTime.date)
      .maybeSingle();

    if (existingLogError) {
      results.push({
        userId: preference.user_id,
        status: "failed",
        reason: existingLogError.message,
      });
      continue;
    }

    if ((existingLog as DigestLogRow | null)?.status === "sent") {
      results.push({
        userId: preference.user_id,
        status: "skipped",
        reason: "already_sent",
      });
      continue;
    }

    let recipientEmail = preference.digest_email?.trim() ?? "";

    if (!recipientEmail) {
      const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(
        preference.user_id,
      );

      if (userError) {
        await supabase.from("email_digest_logs").upsert(
          {
            user_id: preference.user_id,
            digest_date: nyTime.date,
            recipient_email: "",
            status: "failed",
            error_message: userError.message,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,digest_date" },
        );

        results.push({
          userId: preference.user_id,
          status: "failed",
          reason: userError.message,
        });
        continue;
      }

      recipientEmail = userResult.user.email?.trim() ?? "";
    }

    if (!recipientEmail) {
      const errorMessage = "missing_recipient_email";

      await supabase.from("email_digest_logs").upsert(
        {
          user_id: preference.user_id,
          digest_date: nyTime.date,
          recipient_email: "",
          status: "failed",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,digest_date" },
      );

      results.push({
        userId: preference.user_id,
        status: "failed",
        reason: errorMessage,
      });
      continue;
    }

    try {
      const sendResult = await sendDailyDigestEmail({
        to: recipientEmail,
        subject,
        text: digest.text,
        html: digest.html,
      });

      if (sendResult.error) {
        throw new Error(sendResult.error.message);
      }

      await supabase.from("email_digest_logs").upsert(
        {
          user_id: preference.user_id,
          digest_date: nyTime.date,
          recipient_email: recipientEmail,
          status: "sent",
          resend_email_id: sendResult.data?.id ?? null,
          error_message: null,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,digest_date" },
      );

      results.push({
        userId: preference.user_id,
        email: recipientEmail,
        status: "sent",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknown_send_error";

      await supabase.from("email_digest_logs").upsert(
        {
          user_id: preference.user_id,
          digest_date: nyTime.date,
          recipient_email: recipientEmail,
          status: "failed",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,digest_date" },
      );

      results.push({
        userId: preference.user_id,
        email: recipientEmail,
        status: "failed",
        reason: errorMessage,
      });
    }
  }

  return NextResponse.json({
    skipped: false,
    digestDate: nyTime.date,
    subject,
    stats: digest.stats,
    results,
  });
}

export async function GET(request: Request) {
  return handleSendDailyDigest(request);
}

export async function POST(request: Request) {
  return handleSendDailyDigest(request);
}
