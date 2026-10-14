"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass, Icon, Pill, Ring, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";

export type PlanItem = { kind: "focus" | "review"; skill_id: string; skill: string; subtopic: string; topic: string; topic_id: string; mastery: number };
export type PlanDay = { date: string; items: PlanItem[]; mock: boolean; questions: number };
type Plan = { days: PlanDay[]; today_done: number };

const TONES = ["iris", "coral", "lagoon"] as const;

/** The week ahead: two focus skills a day from the learner's weak spots, a review, and a mock on day 7. */
export default function RevisionPlan() {
  const { t, tn, dateLocale } = useT();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [failed, setFailed] = useState(false);
  const [day, setDay] = useState(0);

  useEffect(() => {
    api<Plan>("/progress/plan")
      .then(setPlan)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;
  if (!plan) return <Skeleton className="h-72 rounded-[32px]" />;

  const selected = plan.days[day];
  const weekday = (iso: string, style: "short" | "long") => new Date(`${iso}T12:00:00`).toLocaleDateString(dateLocale, { weekday: style });

  return (
    <section aria-labelledby="plan-title" className="rounded-[32px] bg-surface p-5 shadow-[var(--shadow-md)] ring-1 ring-hairline sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="plan-title" className="font-display text-2xl">
            {t("plan.title")}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{t("plan.subtitle")}</p>
        </div>
        <Pill tone={plan.today_done >= selected.questions ? "good" : "lagoon"}>
          <Icon name="flame" className="h-3.5 w-3.5" /> {t("plan.doneToday", { done: plan.today_done, n: plan.days[0].questions })}
        </Pill>
      </div>

      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="tablist" aria-label={t("plan.title")}>
        {plan.days.map((d, i) => {
          const on = i === day;
          return (
            <button
              key={d.date}
              role="tab"
              aria-selected={on}
              aria-controls="plan-day"
              onClick={() => setDay(i)}
              className={`press flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2.5 text-sm transition-colors ${
                on ? "bg-ink text-canvas shadow-[var(--shadow-md)]" : "bg-surface-2 text-ink-soft hover:text-ink"
              }`}
            >
              <span className="text-xs font-semibold">{i === 0 ? t("plan.today") : weekday(d.date, "short")}</span>
              <span className="font-display text-lg tabular">{new Date(`${d.date}T12:00:00`).getDate()}</span>
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${d.mock ? "bg-coral" : on ? "bg-canvas/60" : "bg-line-strong"}`} />
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selected.date}
          id="plan-day"
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-5 flex flex-col gap-3"
        >
          <p className="text-sm font-semibold">
            {day === 0 ? t("plan.today") : weekday(selected.date, "long")} · <span className="text-ink-soft">{t("plan.questions", { n: selected.questions })}</span>
          </p>
          {selected.items.map((item, i) => (
            <div key={item.skill_id + item.kind} className="flex items-center gap-4 rounded-3xl bg-surface-2 p-3 pr-4">
              <Ring value={item.mastery} size={52} stroke={6} tone={TONES[i % TONES.length]}>
                <span className="text-xs font-bold tabular">{item.mastery}%</span>
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{tn(item.skill)}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                  <span className="min-w-0 truncate">
                    {tn(item.topic)} · {tn(item.subtopic)}
                  </span>
                  <span className="sm:hidden">
                    <Pill tone={item.kind === "review" ? "sun" : "iris"}>{item.kind === "review" ? t("plan.review") : t("plan.focus")}</Pill>
                  </span>
                </p>
              </div>
              <span className="hidden shrink-0 sm:block">
                <Pill tone={item.kind === "review" ? "sun" : "iris"}>{item.kind === "review" ? t("plan.review") : t("plan.focus")}</Pill>
              </span>
              <span className="hidden shrink-0 sm:block">
                <Link href={`/practice?skill=${item.skill_id}`} transitionTypes={["nav-forward"]} className={buttonClass("secondary", "px-4 py-2")}>
                  {t("plan.start")}
                </Link>
              </span>
              <Link href={`/practice?skill=${item.skill_id}`} transitionTypes={["nav-forward"]} aria-label={`${t("plan.start")}: ${tn(item.skill)}`} className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-hairline sm:hidden">
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          ))}
          {selected.mock && (
            <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-coral-soft p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-coral text-white">
                <Icon name="clipboard" className="h-5 w-5" />
              </span>
              <p className="min-w-0 flex-1 text-sm">
                <span className="block font-semibold">{t("plan.mock")}</span>
                <span className="text-ink-soft">{t("plan.mockNote")}</span>
              </p>
              <Link href="/tests" transitionTypes={["nav-forward"]} className={buttonClass("marker", "px-4 py-2")}>
                {t("plan.start")}
              </Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
