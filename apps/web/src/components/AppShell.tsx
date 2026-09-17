"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useTutor } from "@/lib/tutor";
import Logo from "./Logo";
import { Icon, Skeleton } from "./ui";

const NAV = [
  { href: "/dashboard", key: "nav.dashboard", icon: "home" },
  { href: "/practice", key: "nav.practice", icon: "target" },
  { href: "/tests", key: "nav.tests", icon: "clipboard" },
  { href: "/tutor", key: "nav.tutor", icon: "chat" },
  { href: "/profile", key: "nav.profile", icon: "user" },
] as const;

export default function AppShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const { user, loading, logout } = useAuth();
  const { t } = useT();
  const tutor = useTutor();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const container = wide ? "max-w-6xl" : "max-w-4xl";

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
    <div className="flex flex-1 flex-col lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/60 px-3 py-4 lg:flex">
        <Logo href="/dashboard" className="px-2.5 py-1.5 text-[15px]" />

        <nav className="mt-6 flex flex-col gap-0.5" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`press flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm ${
                  active ? "bg-surface-2 font-medium text-ink shadow-[inset_0_0_0_1px_var(--line)]" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-accent" : ""}`} />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <Link href="/tutor" className="press group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:border-line-strong">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {tutor.name.charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-good" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{tutor.name}</span>
              <span className="block text-xs text-ink-soft">{t("tutor.yourTutor")}</span>
            </span>
            <Icon name="chevron" className="h-4 w-4 text-ink-soft transition group-hover:translate-x-0.5" />
          </Link>
          <div className="flex items-center gap-3 rounded-xl px-2.5 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-ink">{initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.display_name}</span>
              <span className="block truncate text-xs text-ink-soft">{user.email}</span>
            </span>
            <button onClick={logout} aria-label={t("nav.signOut")} title={t("nav.signOut")} className="press rounded-md p-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink">
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar below desktop */}
      <header className="glass sticky top-0 z-30 border-b border-line lg:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Logo href="/dashboard" compact className="text-[15px]" />

          <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`press rounded-md px-3 py-1.5 text-sm ${active ? "bg-surface-2 font-medium text-ink" : "text-ink-soft hover:text-ink"}`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/tutor" className="press flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm md:hidden" title={`${t("tutor.yourTutor")}: ${tutor.name}`}>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{tutor.name.charAt(0).toUpperCase()}</span>
              <span className="max-w-24 truncate">{tutor.name}</span>
            </Link>
            <Link href="/profile" aria-label={t("nav.profile")} className="press grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-ink">
              {initial}
            </Link>
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:px-10 lg:pt-10 ${container}`}>
        <div key={pathname} className="rise">
          {children}
        </div>
      </main>

      {/* Phone tab bar */}
      <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line md:hidden" aria-label="Main">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`press flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] ${active ? "font-medium text-ink" : "text-ink-soft"}`}
                >
                  <Icon name={item.icon} className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
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
