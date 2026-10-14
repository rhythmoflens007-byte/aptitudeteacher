"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { useT } from "@/lib/i18n";

/** Shown until today's first answer: protects a running streak, or invites starting one. */
export default function StreakNudge({ streak, today, attempts }: { streak: number; today: number; attempts: number }) {
  const { t } = useT();
  if (today > 0 || attempts === 0) return null;
  const keep = streak > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-4 rounded-[28px] bg-gradient-to-r from-sun-soft to-coral-soft p-4 pr-5 ring-1 ring-hairline"
      role="status"
    >
      <span aria-hidden className="flame grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface text-2xl shadow-[var(--shadow-sm)]">
        {keep ? "🔥" : "✨"}
      </span>
      <p className="min-w-0 flex-1">
        <span className="block font-semibold">{keep ? t("streak.keep", { n: streak }) : t("streak.start")}</span>
        <span className="text-sm text-ink-soft">{keep ? t("streak.keepNote") : t("streak.startNote")}</span>
      </p>
      <Link href="/practice" transitionTypes={["nav-forward"]} className={buttonClass("spark", "px-5 py-2.5")}>
        {t("streak.go")}
      </Link>
    </motion.div>
  );
}
