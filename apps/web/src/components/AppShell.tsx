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
import { Icon, Skeleton } from "./ui";

const NAV = [
  { href: "/dashboard", key: "nav.dashboard", icon: "home" },
  { href: "/practice", key: "nav.practice", icon: "target" },
  { href: "/tests", key: "nav.tests", icon: "clipboard" },
  { href: "/tutor", key: "nav.tutor", icon: "chat" },
  { href: "/profile", key: "nav.profile", icon: "user" },
] as const;

const SPRING = { type: "spring", stiffness: 420, damping: 38 } as const;

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

  // The transition wrapper must be the page's outermost element or React won't animate it.
  // The sidebar, top bar and tab bar carry their own view-transition names, so they stay still.
  return (
    <PageTransition className="flex flex-1 flex-col lg:pl-64">
      {/* Desktop sidebar */}
      <aside
        style={{ viewTransitionName: "app-sidebar" }}
        className="grain fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy px-3 py-5 text-navy-ink lg:flex"
      >
        <Logo href="/dashboard" className="px-2.5" />
        <span className="mx-2.5 mt-5 h-px bg-gold/30" />

        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-ink/45">Study</p>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {NAV.map((item, index) => {
            const active = index === currentIndex;
            return (
              <Link
                key={item.href}
                href={item.href}
                transitionTypes={active ? undefined : direction(index)}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-300 ${
                  active ? "text-white" : "text-navy-ink/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span layoutId="sidebar-active" transition={SPRING} className="absolute inset-0 rounded-md bg-white/10">
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" />
                  </motion.span>
                )}
                <Icon name={item.icon} className="relative h-[18px] w-[18px]" />
                <span className="relative">{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <Link
            href="/tutor"
            transitionTypes={currentIndex === 3 ? undefined : direction(3)}
            className="press group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10"
          >
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-display text-base text-white">
              {tutor.name.charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-navy bg-emerald-400" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{tutor.name}</span>
              <span className="block text-xs text-navy-ink/55">{t("tutor.yourTutor")}</span>
            </span>
            <Icon name="chevron" className="h-4 w-4 text-navy-ink/50 transition-transform duration-500 group-hover:translate-x-0.5" />
          </Link>
          <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-ink font-display text-sm text-navy">{initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{user.display_name}</span>
              <span className="block truncate text-xs text-navy-ink/55">{user.email}</span>
            </span>
            <button onClick={logout} aria-label={t("nav.signOut")} title={t("nav.signOut")} className="press rounded-md p-1.5 text-navy-ink/60 hover:bg-white/10 hover:text-white">
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar below desktop */}
      <header style={{ viewTransitionName: "app-topbar" }} className="glass sticky top-0 z-30 border-b border-line lg:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Logo href="/dashboard" compact />

          <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item, index) => {
              const active = index === currentIndex;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  transitionTypes={active ? undefined : direction(index)}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-md px-3 py-1.5 text-sm transition-colors ${active ? "font-medium text-ink" : "text-ink-soft hover:text-ink"}`}
                >
                  {active && <motion.span layoutId="topbar-active" transition={SPRING} className="absolute inset-x-3 -bottom-[11px] h-[2px] rounded-full bg-accent" />}
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/tutor" className="press flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm md:hidden" title={`${t("tutor.yourTutor")}: ${tutor.name}`}>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent font-display text-xs text-white">{tutor.name.charAt(0).toUpperCase()}</span>
              <span className="max-w-24 truncate">{tutor.name}</span>
            </Link>
            <Link href="/profile" aria-label={t("nav.profile")} className="press grid h-8 w-8 place-items-center rounded-full bg-navy font-display text-sm text-navy-ink">
              {initial}
            </Link>
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-14 lg:px-10 lg:pt-12 ${container}`}>
        {children}
      </main>

      {/* Phone tab bar */}
      <nav style={{ viewTransitionName: "app-tabbar" }} className="glass pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line md:hidden" aria-label="Main">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item, index) => {
            const active = index === currentIndex;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  transitionTypes={active ? undefined : direction(index)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] ${active ? "font-medium text-ink" : "text-ink-soft"}`}
                >
                  {active && <motion.span layoutId="tabbar-active" transition={SPRING} className="absolute inset-x-5 top-0 h-[2px] rounded-full bg-accent" />}
                  <Icon name={item.icon} className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
                  <span className="max-w-full truncate">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </PageTransition>
  );
}
