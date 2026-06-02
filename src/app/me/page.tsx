import Link from "next/link";
import { DailyDigestSettingsForm } from "@/components/daily-digest-settings-form";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/auth/require-user";
import { getNotificationPreference } from "@/lib/notifications/preferences";
import { createClient } from "@/lib/supabase/server";

function formatLastSignIn(value: string | null | undefined) {
  if (!value) {
    return "暂无记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function MePage() {
  const user = await requireUser("/me");
  const supabase = await createClient();
  const preference = await getNotificationPreference(supabase, user.id);

  return (
    <section className="space-y-4 md:space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <h1 className="text-2xl font-semibold tracking-tight">我的</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          这里是当前登录账号的信息、内容入口，以及通知相关设置。
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-zinc-500">用户 ID</dt>
            <dd className="mt-1 break-all text-zinc-900">{user.id}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">邮箱</dt>
            <dd className="mt-1 break-all text-zinc-900">{user.email ?? "未提供"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">最近登录时间</dt>
            <dd className="mt-1 text-zinc-900">{formatLastSignIn(user.last_sign_in_at)}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-lg font-semibold">内容管理</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          查看、编辑或删除你自己发布的帖子，也可以查看别人对你内容的回复。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/me/posts"
            className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            我的帖子
          </Link>
          <Link
            href="/notifications"
            className="inline-flex rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700"
          >
            通知
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-lg font-semibold">每日邮件摘要</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          MVP 版本固定在美股开盘前 10 分钟发送摘要，不提供自定义时间。
        </p>

        <div className="mt-4">
          <DailyDigestSettingsForm
            defaultEnabled={preference.dailyEmailEnabled}
            defaultDigestEmail={preference.digestEmail}
            accountEmail={user.email ?? ""}
          />
        </div>
      </div>
    </section>
  );
}
