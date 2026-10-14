"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { LEAGUE_COLORS, timeUntil, useGameStatus } from "@/lib/game";
import { useT } from "@/lib/i18n";

/** Streak, hearts and XP: always in view, like the counters at the top of a game. */
export default function StatusChips({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useT();
  const status = useGameStatus();
  if (!status) return <div className={`h-9 ${className}`} aria-hidden />;

  const refill = timeUntil(status.next_heart_at);
  const heartsLabel =
    status.hearts >= status.max_hearts
      ? t("game.heartsFull", { n: status.hearts })
      : t("game.heartsRefill", { n: status.hearts, h: refill?.h ?? 0, m: refill?.m ?? 0 });

  const chip = "press flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1.5 text-sm font-bold tabular shadow-[var(--shadow-sm)] ring-1 ring-hairline";
  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "flex-wrap"} ${className}`}>
      <Link href="/dashboard" className={chip} aria-label={t("game.streakLabel", { n: status.streak_days })} title={t("game.streakLabel", { n: status.streak_days })}>
        <span aria-hidden className={status.streak_days > 0 ? "flame" : "grayscale"}>
          🔥
        </span>
        <Pop value={status.streak_days} />
      </Link>
      <Link href="/learn" className={chip} aria-label={heartsLabel} title={heartsLabel}>
        <Icon name="heart" className={`h-4 w-4 ${status.hearts > 0 ? "fill-coral text-coral" : "text-ink-faint"}`} />
        <Pop value={status.hearts} />
      </Link>
      {!compact && (
        <Link href="/leagues" className={chip} aria-label={t("game.xpLabel", { n: status.xp, league: t(`league.${status.league}`) })} title={t(`league.${status.league}`)}>
          <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: LEAGUE_COLORS[status.league] }} />
          <Pop value={status.xp} />
          <span className="text-xs font-semibold text-ink-soft">XP</span>
        </Link>
      )}
    </div>
  );
}

function Pop({ value }: { value: number }) {
  return (
    <span className="relative inline-grid overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
          {value.toLocaleString("en-IN")}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
