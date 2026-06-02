import Link from "next/link";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { getUnreadNotificationCount } from "@/lib/notifications/data";
import { createClient } from "@/lib/supabase/server";

type AppShellProps = {
  children: React.ReactNode;
};

const desktopLinks = [
  { href: "/", label: "首页" },
  { href: "/stocks", label: "股票" },
  { href: "/quick", label: "发布" },
  { href: "/portfolio", label: "持仓" },
  { href: "/portfolios", label: "圈内持仓" },
  { href: "/notifications", label: "通知" },
  { href: "/me", label: "我的" },
];

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const unreadNotificationCount = user
    ? await getUnreadNotificationCount(supabase, user.id)
    : 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="text-lg font-semibold tracking-tight">持仓圈</div>
          <nav className="hidden items-center gap-4 md:flex">
            {desktopLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-sm text-zinc-600 transition-colors hover:text-zinc-900"
              >
                {item.label}
                {item.href === "/notifications" && unreadNotificationCount > 0 ? (
                  <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-blue-600 px-1 text-center text-[10px] leading-4 text-white">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 md:px-5 md:pb-10 md:pt-6">
        {children}
      </main>

      <MobileBottomNav unreadNotificationCount={unreadNotificationCount} />
    </div>
  );
}
