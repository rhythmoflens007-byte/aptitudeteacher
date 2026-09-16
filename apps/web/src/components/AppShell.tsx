"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Spinner } from "./ui";

const NAV = [
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/practice", key: "nav.practice" },
  { href: "/tests", key: "nav.tests" },
  { href: "/tutor", key: "nav.tutor" },
  { href: "/profile", key: "nav.profile" },
] as const;

export default function AppShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const { user, loading } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold">
            <Image src="/icon.svg" alt="" width={28} height={28} unoptimized />
            <span className="hidden sm:inline">Aptitude Teacher</span>
          </Link>
          <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                    active ? "bg-accent-soft font-medium text-accent" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-6 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>{children}</main>
    </div>
  );
}
