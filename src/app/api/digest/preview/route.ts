import { NextResponse } from "next/server";
import { generateDailyDigest } from "@/lib/digest/generate-daily-digest";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  if ((fromParam && Number.isNaN(from?.getTime())) || (toParam && Number.isNaN(to?.getTime()))) {
    return NextResponse.json({ error: "from 或 to 参数无效" }, { status: 400 });
  }

  const digest = await generateDailyDigest({ from, to });

  return NextResponse.json(digest);
}
