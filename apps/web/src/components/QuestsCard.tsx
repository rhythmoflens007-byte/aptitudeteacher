"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { Icon, ProgressBar, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { Quest, refreshGame } from "@/lib/game";
import { useT } from "@/lib/i18n";

const QUEST_ICON: Record<Quest["code"], { icon: string; tone: "sun" | "coral" | "lagoon" | "iris" | "spark" }> = {
  xp: { icon: "bolt", tone: "sun" },
  lessons: { icon: "map", tone: "lagoon" },
  perfect: { icon: "star", tone: "iris" },
  in_a_row: { icon: "flame", tone: "coral" },
  minutes: { icon: "clock", tone: "spark" },
};

/** Today's three quests with a chest to open for each one finished. */
export default function QuestsCard({ initial }: { initial?: Quest[] }) {
  const { t } = useT();
  const toast = useToast();
  const [quests, setQuests] = useState<Quest[] | null>(initial ?? null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    api<Quest[]>("/game/quests")
      .then(setQuests)
      .catch(() => setQuests([]));
  }, [initial]);

  async function claim(code: Quest["code"]) {
    setOpening(code);
    try {
      await api("/game/quests/" + code + "/claim", { method: "POST" });
      setQuests((qs) => qs?.map((q) => (q.code === code ? { ...q, claimed: true } : q)) ?? null);
      toast({ title: t("quest.claimed", { n: 15 }), icon: "gift", tone: "sun" });
      void refreshGame();
    } catch {
      toast({ title: t("quest.claimFailed"), icon: "alert", tone: "coral" });
    } finally {
      setOpening(null);
    }
  }

  return (
    <section aria-labelledby="quests-title" className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-md)] ring-1 ring-hairline">
      <div className="flex items-center justify-between gap-2">
        <h2 id="quests-title" className="font-display text-xl">
          {t("quest.title")}
        </h2>
        <span className="text-xs text-ink-soft">{t("quest.resets")}</span>
      </div>
      {!quests ? (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {quests.map((q) => {
            const look = QUEST_ICON[q.code];
            return (
              <li key={q.code} className="flex items-center gap-3">
                <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${q.done ? "bg-success-soft text-success" : "bg-surface-2 text-ink-soft"}`}>
                  <Icon name={q.done ? "check" : look.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{t(`quest.${q.code}`, { n: q.target })}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1">
                      <ProgressBar value={(100 * q.progress) / q.target} tone={q.done ? "good" : look.tone} label={t(`quest.${q.code}`, { n: q.target })} />
                    </div>
                    <span className="text-xs font-semibold text-ink-soft tabular">
                      {q.progress}/{q.target}
                    </span>
                  </div>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  {q.claimed ? (
                    <motion.span key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid h-10 w-10 place-items-center text-success" aria-label={t("quest.collected")}>
                      <Icon name="check" className="h-5 w-5" />
                    </motion.span>
                  ) : (
                    <motion.button
                      key="chest"
                      disabled={!q.done || opening === q.code}
                      onClick={() => claim(q.code)}
                      animate={q.done ? { rotate: [0, -8, 8, -5, 0] } : undefined}
                      transition={q.done ? { duration: 0.9, repeat: Infinity, repeatDelay: 1.6 } : undefined}
                      aria-label={q.done ? t("quest.open", { n: q.reward }) : t("quest.locked")}
                      title={q.done ? t("quest.open", { n: q.reward }) : t("quest.locked")}
                      className={`press grid h-10 w-10 place-items-center rounded-2xl ${q.done ? "bg-sun text-coal shadow-[var(--shadow-md)]" : "bg-surface-2 text-ink-faint"}`}
                    >
                      <Icon name="gift" className="h-5 w-5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
