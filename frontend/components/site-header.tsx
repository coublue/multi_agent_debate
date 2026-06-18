"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/articles", label: "文章库" },
  { href: "/debates", label: "历史辩论" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-800/80 bg-black/55 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          className="flex min-w-0 items-center gap-2 rounded-md text-sm font-semibold text-white outline-none transition focus-visible:ring-2 focus-visible:ring-purple-400"
          href="/"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white text-sm font-black text-black">
            M
          </span>
          <span className="hidden truncate sm:block">Multi Agent Debate</span>
          <span className="truncate sm:hidden">MAD</span>
        </Link>

        <nav aria-label="主要导航" className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/articles" && pathname.startsWith("/articles/")) ||
              (item.href === "/debates" && /^\/debates\/\d+\/?$/.test(pathname));
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 outline-none transition focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  active
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
