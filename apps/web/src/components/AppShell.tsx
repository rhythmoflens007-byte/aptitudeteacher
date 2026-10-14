"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useTutor } from "@/lib/tutor";
import Logo from "./Logo";
import PageTransition from "./PageTransition";
import StatusChips from "./StatusChips";
import { ThemeToggle } from "./ThemeToggle";
import { Blobs, Icon, Skeleton } from "./ui";

const NAV = [
  { href: "/dashboard", key: "nav.dashboard", icon: "home", tint: "text-iris", tab: true },
  { href: "/learn", key: "nav.learn", icon: "map", tint: "text-lagoon-600", tab: true },
  { href: "/practice", key: "nav.practice", icon: "target", tint: "text-coral", tab: true },
  { href: "/tests", key: "nav.tests", icon: "clipboard", tint: "text-lagoon-600", tab: false },
  { href: "/leagues", key: "nav.leagues", icon: "trophy", tint: "text-sun-600", tab: true },
  { href: "/tutor", key: "nav.tutor", icon: "chat", tint: "text-violet", tab: true },
  { href: "/profile", key: "nav.profile", icon: "user", tint: "text-sun-600", tab: false },
] as const;

const TUTOR_INDEX = NAV.findIndex((item) => item.href === "/tutor");

const SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

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
  const currentIndex = NAV.findIndex((item) => pathname.startsWith(item.href));
  // Moving down the menu slides content left; moving up slides it right.
  const direction = (index: number) => [index > currentIndex ? "nav-forward" : "nav-back"];

  if (loading || !user) {
    return (
      <div className={`mx-auto flex w-full ${container} flex-col gap-4 px-4 py-20`} aria-busy>
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const initial = user.display_name.trim().charAt(0).toUpperCase() || "?";

  // The transition wrapper must be the page's outermost element or React won't animate it.
  // The sidebar, top bar and tab bar carry their own view-transition names, so they stay still.
  return (
    <PageTransition className="relative flex flex-1 flex-col lg:pl-72">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <Blobs />
      </div>

      {/* Desktop sidebar: a floating glass panel */}
      <aside style={{ viewTransitionName: "app-sidebar" }} className="fixed inset-y-3 left-3 z-30 hidden w-66 flex-col lg:flex">
        <div className="glass flex h-full flex-col rounded-[28px] p-4 shadow-[var(--shadow-lg)] ring-1 ring-hairline">
          <div className="flex items-center justify-between">
            <Logo href="/dashboard" className="px-2 py-1" />
            <ThemeToggle />
          </div>

          <StatusChips className="mt-5" />

          <nav className="mt-4 flex flex-col gap-1" aria-label={t("nav.main")}>
            {NAV.map((item, index) => {
              const active = index === currentIndex;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  transitionTypes={active ? undefined : direction(index)}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-medium transition-colors duration-300 ${
                    active ? "text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {active && <motion.span layoutId="sidebar-active" transition={SPRING} className="absolute inset-0 rounded-2xl bg-surface shadow-[var(--shadow-sm)]" />}
                  <span className={`relative grid h-8 w-8 place-items-center rounded-xl transition-transform duration-500 group-hover:scale-110 ${active ? `bg-surface-2 ${item.tint}` : ""}`}>
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="relative">{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-2">
            <Link
              href="/tutor"
              transitionTypes={currentIndex === TUTOR_INDEX ? undefined : direction(TUTOR_INDEX)}
              className="press group relative overflow-hidden rounded-3xl bg-spark p-[1.5px]"
            >
              <span className="flex items-center gap-3 rounded-[22px] bg-surface/95 p-3">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-spark text-base font-bold text-white">
                  {tutor.name.charAt(0).toUpperCase()}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-success" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{tutor.name}</span>
                  <span className="block text-xs text-ink-soft">{t("tutor.yourTutor")}</span>
                </span>
                <Icon name="chevron" className="h-4 w-4 text-ink-faint transition-transform duration-500 group-hover:translate-x-0.5" />
              </span>
            </Link>
            <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-canvas">{initial}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{user.display_name}</span>
                <span className="block truncate text-xs text-ink-soft">{user.email}</span>
              </span>
              <button onClick={logout} aria-label={t("nav.signOut")} title={t("nav.signOut")} className="press rounded-full p-2 text-ink-soft hover:bg-surface-2 hover:text-ink">
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Top bar below desktop */}
      <header style={{ viewTransitionName: "app-topbar" }} className="glass sticky top-0 z-30 border-b border-hairline lg:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Logo href="/dashboard" compact />
          <StatusChips className="ml-auto" compact />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/profile" aria-label={t("nav.profile")} className="press grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-semibold text-canvas">
              {initial}
            </Link>
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-12 ${container}`}>{children}</main>

      {/* Phone tab bar: a floating glass pill */}
      <nav style={{ viewTransitionName: "app-tabbar" }} className="pb-safe fixed inset-x-3 bottom-3 z-30 lg:hidden" aria-label={t("nav.main")}>
        <ul className="glass mx-auto grid max-w-md grid-cols-5 rounded-[26px] p-1.5 shadow-[var(--shadow-lg)] ring-1 ring-hairline">
          {NAV.map((item, index) => {
            if (!item.tab) return null;
            const active = index === currentIndex;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  transitionTypes={active ? undefined : direction(index)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-0.5 rounded-[20px] px-1 py-2 text-[10.5px] font-semibold ${active ? "text-ink" : "text-ink-soft"}`}
                >
                  {active && <motion.span layoutId="tabbar-active" transition={SPRING} className="absolute inset-0 rounded-[20px] bg-surface shadow-[var(--shadow-sm)]" />}
                  <Icon name={item.icon} className={`relative h-5 w-5 ${active ? item.tint : ""}`} />
                  <span className="relative max-w-full truncate">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </PageTransition>
  );
}
