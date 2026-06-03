import { NextResponse } from "next/server";
import { generateDailyDigest } from "@/lib/digest/generate-daily-digest";
import { sendDailyDigestEmail } from "@/lib/email/resend";
import { DAILY_DIGEST_TIME } from "@/lib/notifications/preferences";
import { createAdminClient } from "@/lib/supabase/admin";

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

type RecipientResult = {
  userId: string;
  email?: string;
  status: "sent" | "failed" | "skipped" | "dry_run";
  reason?: string;
};

type HandleSendDailyDigestOptions = {
  source?: string;
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

function getBooleanParam(searchParams: URLSearchParams, name: string) {
  return searchParams.get(name)?.toLowerCase() === "true";
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

function formatNewYorkTime(parts: NewYorkTimeParts) {
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function isInsideDigestWindow(parts: NewYorkTimeParts) {
  const minuteOfDay = parts.hour * 60 + parts.minute;
  const startMinute = 9 * 60 + 15;
  const endMinute = 9 * 60 + 25;
  return minuteOfDay >= startMinute && minuteOfDay <= endMinute;
}

function getResultSummary(results: RecipientResult[]) {
  return {
    sent: results.filter((result) => result.status === "sent").length,
    failed: results.filter((result) => result.status === "failed").length,
    alreadySent: results.filter((result) => result.reason === "already_sent").length,
    errors: results
      .filter((result) => result.status === "failed")
      .map((result) => ({
        userId: result.userId,
        reason: result.reason ?? "unknown_error",
      })),
  };
}

async function resolveRecipientEmail(
  supabase: ReturnType<typeof createAdminClient>,
  preference: PreferenceRow,
) {
  const digestEmail = preference.digest_email?.trim();

  if (digestEmail) {
    return {
      email: digestEmail,
      error: null,
      source: "preference" as const,
    };
  }

  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(
    preference.user_id,
  );

  if (userError) {
    return {
      email: "",
      error: userError.message,
      source: "account" as const,
    };
  }

  return {
    email: userResult.user.email?.trim() ?? "",
    error: null,
    source: "account" as const,
  };
}

export async function handleSendDailyDigest(
  request: Request,
  options: HandleSendDailyDigestOptions = {},
) {
  const requestUrl = new URL(request.url);
  const force = getBooleanParam(requestUrl.searchParams, "force");
  const dryRun = getBooleanParam(requestUrl.searchParams, "dryRun");
  const source = options.source ?? "default";

  console.log("[daily-digest-cron] route called", {
    source,
    method: request.method,
    force,
    dryRun,
  });

  const providedSecret = normalizeAuthorizationHeader(request.headers.get("authorization"));
  const expectedSecret = getRequiredEnv("CRON_SECRET");

  if (!providedSecret || providedSecret !== expectedSecret) {
    console.log("[daily-digest-cron] auth failed", { source });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[daily-digest-cron] auth passed", { source });

  const nyTime = getNewYorkTimeParts(new Date());
  const nyTimeText = formatNewYorkTime(nyTime);

  if (!force && !isInsideDigestWindow(nyTime)) {
    console.log("[daily-digest-cron] skipped outside timing window", {
      source,
      nyDate: nyTime.date,
      nyTime: nyTimeText,
    });

    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "outside_market_open_digest_window",
      force,
      dryRun,
      recipientsFound: 0,
      sent: 0,
      failed: 0,
      alreadySent: 0,
      errors: [],
      nyDate: nyTime.date,
      nyTime: nyTimeText,
    });
  }

  console.log("[daily-digest-cron] timing guard passed", {
    source,
    force,
    nyDate: nyTime.date,
    nyTime: nyTimeText,
  });

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
  console.log("[daily-digest-cron] recipients loaded", {
    source,
    recipientsFound: preferences.length,
  });

  const digest = await generateDailyDigest({ supabase });
  const subject = `持仓圈开盘前摘要 - ${nyTime.date}`;
  const results: RecipientResult[] = [];

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

    const recipient = await resolveRecipientEmail(supabase, preference);

    if (recipient.error || !recipient.email) {
      const errorMessage = recipient.error ?? "missing_recipient_email";

      if (!dryRun) {
        await supabase.from("email_digest_logs").upsert(
          {
            user_id: preference.user_id,
            digest_date: nyTime.date,
            recipient_email: recipient.email,
            status: "failed",
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,digest_date" },
        );
      }

      results.push({
        userId: preference.user_id,
        status: "failed",
        reason: errorMessage,
      });
      continue;
    }

    if (dryRun) {
      results.push({
        userId: preference.user_id,
        email: recipient.email,
        status: "dry_run",
        reason: recipient.source,
      });
      continue;
    }

    try {
      const sendResult = await sendDailyDigestEmail({
        to: recipient.email,
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
          recipient_email: recipient.email,
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
        email: recipient.email,
        status: "sent",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknown_send_error";

      await supabase.from("email_digest_logs").upsert(
        {
          user_id: preference.user_id,
          digest_date: nyTime.date,
          recipient_email: recipient.email,
          status: "failed",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,digest_date" },
      );

      results.push({
        userId: preference.user_id,
        email: recipient.email,
        status: "failed",
        reason: errorMessage,
      });
    }
  }

  const summary = getResultSummary(results);

  console.log("[daily-digest-cron] send run completed", {
    source,
    force,
    dryRun,
    recipientsFound: preferences.length,
    sent: summary.sent,
    failed: summary.failed,
    alreadySent: summary.alreadySent,
  });

  return NextResponse.json({
    ok: true,
    skipped: false,
    reason: null,
    force,
    dryRun,
    recipientsFound: preferences.length,
    sent: summary.sent,
    failed: summary.failed,
    alreadySent: summary.alreadySent,
    errors: summary.errors,
    digestDate: nyTime.date,
    nyTime: nyTimeText,
    subject,
    stats: digest.stats,
    results,
    preview: dryRun
      ? {
          text: digest.text,
          html: digest.html,
        }
      : null,
  });
}
