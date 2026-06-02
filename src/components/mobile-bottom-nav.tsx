"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首页", icon: "⌂" },
  { href: "/stocks", label: "股票", icon: "▦" },
  { href: "/quick", label: "发布", icon: "✎" },
  { href: "/portfolio", label: "持仓", icon: "▤" },
  { href: "/portfolios", label: "圈内", icon: "◎" },
  { href: "/notifications", label: "通知", icon: "●" },
  { href: "/me", label: "我的", icon: "○" },
];

type MobileBottomNavProps = {
  unreadNotificationCount: number;
};

export function MobileBottomNav({ unreadNotificationCount }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-7">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[10px] ${
                  isActive ? "text-blue-600" : "text-zinc-500"
                }`}
              >
                <span className="relative text-base leading-none">
                  {item.icon}
                  {item.href === "/notifications" && unreadNotificationCount > 0 ? (
                    <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-blue-600 px-1 text-center text-[10px] leading-4 text-white">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
