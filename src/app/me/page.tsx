import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">我的</h1>
        <p className="mt-2 text-sm text-zinc-600">当前登录账号信息如下。</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">用户 ID</dt>
            <dd className="mt-1 break-all text-zinc-900">{user.id}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">邮箱</dt>
            <dd className="mt-1 text-zinc-900">{user.email ?? "未提供"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">最近登录时间</dt>
            <dd className="mt-1 text-zinc-900">{user.last_sign_in_at ?? "暂无记录"}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>
    </section>
  );
}
