"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useTutor } from "@/lib/tutor";
import { Icon, Skeleton } from "./ui";

const NAV = [
  { href: "/dashboard", key: "nav.dashboard", icon: "home" },
  { href: "/practice", key: "nav.practice", icon: "target" },
  { href: "/tests", key: "nav.tests", icon: "clipboard" },
  { href: "/tutor", key: "nav.tutor", icon: "chat" },
  { href: "/profile", key: "nav.profile", icon: "user" },
] as const;

export default function AppShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const { user, loading } = useAuth();
  const { t } = useT();
  const tutor = useTutor();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const container = wide ? "max-w-6xl" : "max-w-5xl";

  if (loading || !user) {
    return (
      <div className={`mx-auto flex w-full ${container} flex-col gap-4 px-4 py-20`} aria-busy>
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const initial = user.display_name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-1 flex-col">
      <header className="glass sticky top-0 z-30 border-b border-line/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/dashboard" className="press flex shrink-0 items-center gap-2 font-display text-lg font-semibold">
            <Image src="/icon.svg" alt="" width={30} height={30} unoptimized className="drop-shadow-sm" />
            <span className="hidden sm:inline">Aptitude Teacher</span>
          </Link>

          <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`press flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    active ? "bg-accent-soft font-medium text-accent shadow-[inset_0_0_0_1px_var(--accent-soft)]" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/tutor"
              className="press hidden items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1 pr-3 text-sm sm:flex"
              title={`${t("tutor.yourTutor")}: ${tutor.name}`}
            >
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-white ${tutor.gender === "female" ? "bg-brand" : "bg-sunrise"}`}>
                {tutor.name.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-24 truncate">{tutor.name}</span>
            </Link>
            <Link
              href="/profile"
              aria-label={t("nav.profile")}
              className="press grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-semibold text-paper"
            >
              {initial}
            </Link>
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full flex-1 px-4 pb-28 pt-6 md:pb-10 ${container}`}>
        <div key={pathname} className="rise">
          {children}
        </div>
      </main>

      <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line/70 md:hidden" aria-label="Main">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`press relative flex flex-col items-center gap-0.5 px-1 pb-2 pt-2.5 text-[11px] transition ${active ? "text-accent" : "text-ink-soft"}`}
                >
                  <span className={`absolute top-0 h-0.5 rounded-full bg-brand transition-all duration-300 ${active ? "w-8 opacity-100" : "w-0 opacity-0"}`} />
                  <span className={`grid h-8 w-12 place-items-center rounded-full transition ${active ? "bg-accent-soft" : ""}`}>
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <span className="max-w-full truncate">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
