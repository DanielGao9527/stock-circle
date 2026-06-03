import { handleSendDailyDigest } from "@/lib/digest/send-daily-digest-cron";

export async function GET(request: Request) {
  return handleSendDailyDigest(request, { source: "standard-cron" });
}

export async function POST(request: Request) {
  return handleSendDailyDigest(request, { source: "standard-cron" });
}
