import Link from "next/link";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

type AppShellProps = {
  children: React.ReactNode;
};

const desktopLinks = [
  { href: "/", label: "首页" },
  { href: "/stocks", label: "股票" },
  { href: "/quick", label: "发布" },
  { href: "/portfolio", label: "持仓" },
  { href: "/portfolios", label: "圈内持仓" },
  { href: "/me", label: "我的" },
  { href: "/import", label: "导入" },
];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="text-lg font-semibold tracking-tight">StockCircle</div>
          <nav className="hidden items-center gap-4 md:flex">
            {desktopLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-5 md:pb-8">{children}</main>

      <MobileBottomNav />
    </div>
  );
}
