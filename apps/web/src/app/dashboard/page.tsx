"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { FadeIn } from "@/components/motion";
import RevisionPlan from "@/components/RevisionPlan";
import ShareScore from "@/components/ShareScore";
import StreakNudge from "@/components/StreakNudge";
import TutorAvatar from "@/components/TutorAvatar";
import { ActivityRings, buttonClass, CountUp, ErrorState, Icon, IconTile, MISCONCEPTION_KEYS, Pill, ProgressBar, Ring, Skeleton, SpotlightCard } from "@/components/ui";
import { api, Dashboard } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useTutor } from "@/lib/tutor";

const TOPIC_STYLE = [
  { icon: "brain", tone: "iris" as const, bar: "iris" as const },
  { icon: "chart", tone: "coral" as const, bar: "coral" as const },
  { icon: "book", tone: "lagoon" as const, bar: "lagoon" as const },
];

export default function DashboardPage() {
  return (
    <AppShell wide>
      <DashboardView />
    </AppShell>
  );
}

function DashboardView() {
  const { t, tn, dateLocale, errorText } = useT();
  const tutor = useTutor();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Dashboard>("/progress/dashboard"));
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, [errorText]);

  useEffect(() => {
    api<Dashboard>("/progress/dashboard")
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, [errorText]);

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) {
    return (
      <div className="flex flex-col gap-5" aria-busy aria-label={t("common.loading")}>
        <Skeleton className="h-20 w-2/3" />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const { gamification: g, stats, daily_goal: goal } = data;
  const maxTrend = Math.max(1, ...data.trend.map((d) => d.attempts));
  const goalPct = (100 * goal.completed) / goal.target;
  const weakest = data.weak_skills[0];
  const tip = weakest ? t("dash.tipWeak", { skill: tn(weakest.name) }) : stats.attempts ? t("dash.tipRoll") : t("dash.tipStart", { gender: tutor.gender });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dash.morning") : hour < 17 ? t("dash.afternoon") : t("dash.evening");

  const tiles = [
    { label: t("dash.level"), icon: "sparkles", tone: "iris" as const, value: <CountUp value={g.level} />, sub: t("dash.xpTotal", { n: g.xp }) },
    {
      label: t("dash.streak"),
      icon: "flame",
      tone: "coral" as const,
      value: (
        <span className="flex items-baseline gap-1">
          <CountUp value={g.streak_days} />
          {g.streak_days > 0 && (
            <span className="flame text-2xl" aria-hidden>
              🔥
            </span>
          )}
        </span>
      ),
      sub: t("dash.best", { n: g.longest_streak_days }),
    },
    {
      label: t("dash.accuracy"),
      icon: "target",
      tone: "lagoon" as const,
      value: stats.accuracy === null ? "—" : <CountUp value={stats.accuracy} suffix="%" />,
      sub: t("dash.answered", { n: stats.attempts }),
    },
    {
      label: t("dash.speed"),
      icon: "clock",
      tone: "sun" as const,
      value: stats.avg_time_s === null ? "—" : <CountUp value={stats.avg_time_s} decimals={1} suffix="s" />,
      sub: t("dash.today", { n: stats.today }),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <FadeIn className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">{greeting}</p>
          <h1 className="font-display text-4xl sm:text-5xl">
            {data.user.display_name.split(" ")[0]} <span aria-hidden>👋</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.attempts > 0 && (
            <ShareScore
              label={t("share.progress")}
              filename="aptitude-progress.png"
              card={() => ({
                eyebrow: t("share.myProgress"),
                name: data.user.display_name,
                headline: `${t("dash.level")} ${g.level}`,
                caption: t("dash.xpTotal", { n: g.xp }),
                stats: [
                  { label: t("dash.streak"), value: `${g.streak_days}` },
                  { label: t("dash.accuracy"), value: stats.accuracy === null ? "—" : `${stats.accuracy}%` },
                  { label: t("share.answered"), value: `${stats.attempts}` },
                  { label: t("dash.badges"), value: `${data.badges.filter((b) => b.earned_at).length}/${data.badges.length}` },
                ],
                bars: data.topics.map((tp) => ({ label: tn(tp.name), value: tp.mastery })),
                footer: t("share.footer"),
              })}
            />
          )}
          <Link href="/tests" transitionTypes={["nav-forward"]} className={buttonClass("secondary")}>
            <Icon name="clipboard" className="h-4 w-4" /> {t("dash.mockTest")}
          </Link>
          <Link href="/practice" transitionTypes={["nav-forward"]} className={buttonClass("spark")}>
            {t("dash.goalStart")} <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </FadeIn>

      <StreakNudge streak={g.streak_days} today={stats.today} attempts={stats.attempts} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <FadeIn delay={0.05}>
          <div className="relative flex h-full items-end overflow-hidden rounded-[32px] bg-gradient-to-br from-iris via-violet to-coral p-1 shadow-[var(--shadow-lg)]">
            <div className="relative flex h-full w-full items-center gap-4 overflow-hidden rounded-[29px] bg-gradient-to-br from-[#5b5bf5] to-[#8a55ef] text-white">
              <motion.div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-coral/40 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 7, repeat: Infinity }} />
              <TutorAvatar gender={tutor.gender} mood="happy" stage={false} className="relative hidden h-48 w-40 shrink-0 self-end sm:block" />
              <div className="relative flex min-w-0 flex-1 flex-col gap-4 p-6 sm:pl-0">
                <span className="flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sun" /> {t("dash.says", { name: tutor.name, gender: tutor.gender })}
                </span>
                <p className="font-display text-2xl leading-snug text-balance sm:text-[28px]">{tip}</p>
                <Link href="/tutor" transitionTypes={["nav-forward"]} className="press flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-coal">
                  {t("dash.letsTalk")} <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <SpotlightCard tint="coral" tilt={false} className="flex h-full items-center gap-6 p-6">
            <ActivityRings
              size={150}
              rings={[
                { value: goalPct, tone: "coral", label: t("dash.goal") },
                { value: stats.accuracy ?? 0, tone: "lagoon", label: t("dash.accuracy") },
                { value: Math.min(100, (g.streak_days / 7) * 100), tone: "sun", label: t("dash.weeklyStreak") },
              ]}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="font-semibold">{t("dash.todayTitle")}</p>
              {[
                { label: t("dash.goalShort"), value: `${goal.completed}/${goal.target}`, dot: "bg-coral" },
                { label: t("dash.accuracy"), value: stats.accuracy === null ? "—" : `${stats.accuracy}%`, dot: "bg-lagoon" },
                { label: t("dash.streakShort"), value: t("dash.streakOf7", { n: g.streak_days }), dot: "bg-sun" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                  <span className="text-ink-soft">{row.label}</span>
                  <span className="ml-auto font-semibold tabular">{row.value}</span>
                </div>
              ))}
              <Pill tone={goal.completed >= goal.target ? "good" : "coral"}>
                {goal.completed >= goal.target ? t("dash.goalDone") : t("dash.toGo", { n: goal.target - goal.completed })}
              </Pill>
            </div>
          </SpotlightCard>
        </FadeIn>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <FadeIn key={tile.label} delay={0.05 * i}>
            <SpotlightCard tint={tile.tone} className="h-full p-5">
              <IconTile name={tile.icon} tone={tile.tone} />
              <div className="mt-4 font-display text-4xl">{tile.value}</div>
              <p className="mt-1 text-sm font-medium">{tile.label}</p>
              <p className="text-xs text-ink-soft tabular">{tile.sub}</p>
              {i === 0 && (
                <div className="mt-3">
                  <ProgressBar value={(100 * g.xp_into_level) / g.xp_per_level} tone="spark" label={t("dash.toLevel", { have: g.xp_into_level, need: g.xp_per_level, level: g.level + 1 })} />
                  <p className="mt-1.5 text-[11px] text-ink-soft tabular">{t("dash.toLevel", { have: g.xp_into_level, need: g.xp_per_level, level: g.level + 1 })}</p>
                </div>
              )}
            </SpotlightCard>
          </FadeIn>
        ))}
      </div>

      <FadeIn>
        <RevisionPlan />
      </FadeIn>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <FadeIn>
          <div className="rounded-[32px] bg-surface p-2 shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h2 className="font-display text-2xl">{t("dash.mastery")}</h2>
              <span className="text-xs text-ink-soft">{t("dash.tapForSkills")}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {data.topics.map((topic, ti) => {
                const style = TOPIC_STYLE[ti % 3];
                const open = openTopic === topic.id;
                return (
                  <li key={topic.id} className={`rounded-3xl transition-colors duration-300 ${open ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
                    <button className="flex w-full items-center gap-4 p-4 text-left" onClick={() => setOpenTopic(open ? null : topic.id)} aria-expanded={open}>
                      <IconTile name={style.icon} tone={style.tone} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-semibold">{tn(topic.name)}</span>
                          <span className="text-sm font-bold tabular">{topic.mastery}%</span>
                        </div>
                        <div className="mt-2">
                          <ProgressBar value={topic.mastery} tone={style.bar} />
                        </div>
                        <p className="mt-1.5 text-xs text-ink-soft tabular">
                          {t("dash.attempts", { n: topic.attempts })}
                          {topic.accuracy !== null ? ` · ${t("dash.accuracyPct", { n: topic.accuracy })}` : ""} · {t("dash.skills", { n: topic.skills.length })}
                        </p>
                      </div>
                      <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-ink-faint">
                        <Icon name="chevron" className="h-4 w-4" />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                          <ul className="flex flex-col gap-2 px-4 pb-4">
                            {topic.skills.map((s) => (
                              <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm">
                                <span className="min-w-0 flex-1 truncate">
                                  <span className="text-ink-soft">{tn(s.subtopic)} · </span>
                                  {tn(s.name)}
                                </span>
                                <span className="w-20">
                                  <ProgressBar value={s.mastery} tone={style.bar} />
                                </span>
                                <span className="w-10 text-right font-semibold tabular">{s.mastery}%</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </div>
        </FadeIn>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2 xl:flex xl:flex-col">
          <FadeIn>
            <div className="rounded-[32px] bg-surface p-6 shadow-[var(--shadow-md)]">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">{t("dash.trend")}</h2>
                <span className="flex items-center gap-3 text-[11px] text-ink-soft">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-iris" /> {t("dash.correct")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-coral-soft ring-1 ring-coral/40" /> {t("dash.wrong")}
                  </span>
                </span>
              </div>
              <div className="mt-6 flex h-36 items-end gap-2.5" role="img" aria-label={t("dash.trendLabel")}>
                {data.trend.map((d, i) => {
                  const day = new Date(d.date + "T00:00:00").toLocaleDateString(dateLocale, { weekday: "short" });
                  const isToday = i === data.trend.length - 1;
                  const height = (96 * d.attempts) / maxTrend;
                  return (
                    <div key={d.date} className="group flex flex-1 flex-col items-center gap-2" title={t("dash.correctOf", { correct: d.correct, n: d.attempts })}>
                      <span className="text-[10px] font-semibold text-ink-soft tabular">{d.attempts || ""}</span>
                      <div className="flex w-full max-w-9 flex-col justify-end overflow-hidden rounded-xl bg-surface-2" style={{ height: 96 }}>
                        <motion.div
                          className="flex w-full origin-bottom flex-col justify-end"
                          style={{ height }}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.1 + i * 0.05 }}
                        >
                          <div className="w-full bg-coral-soft" style={{ height: `${d.attempts ? (100 * (d.attempts - d.correct)) / d.attempts : 0}%` }} />
                          <div className={`w-full ${isToday ? "bg-spark" : "bg-iris"}`} style={{ height: `${d.attempts ? (100 * d.correct) / d.attempts : 0}%` }} />
                        </motion.div>
                      </div>
                      <span className={`text-[11px] ${isToday ? "font-bold text-ink" : "text-ink-soft"}`}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="flex h-full flex-col rounded-[32px] bg-surface p-6 shadow-[var(--shadow-md)]">
              <h2 className="font-display text-2xl">{t("dash.weak")}</h2>
              {data.weak_skills.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center text-sm text-ink-soft">
                  <IconTile name="target" tone="iris" />
                  {t("dash.weakEmpty")}
                </div>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {data.weak_skills.map((s) => (
                    <li key={s.id} className="flex items-center gap-3">
                      <Ring value={Math.max(s.mastery, 3)} size={42} stroke={5} tone={s.mastery < 35 ? "coral" : "sun"}>
                        <span className="text-[10px] font-bold tabular">{s.mastery}</span>
                      </Ring>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{tn(s.name)}</p>
                        <p className="truncate text-xs text-ink-soft tabular">
                          {tn(s.subtopic)} · {t("dash.overTries", { pct: s.accuracy ?? 0, n: s.attempts })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/tutor" transitionTypes={["nav-forward"]} className={buttonClass("secondary", "mt-5 w-full")}>
                <Icon name="chat" className="h-4 w-4" /> {t("dash.workOn", { name: tutor.name })}
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>

      <FadeIn>
        <div className="rounded-[32px] bg-surface p-6 shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">{t("dash.badges")}</h2>
            <Pill tone="sun">{t("dash.earned", { have: data.badges.filter((b) => b.earned_at).length, total: data.badges.length })}</Pill>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.badges.map((b, i) => (
              <motion.li
                key={b.code}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: i * 0.04 }}
                whileHover={b.earned_at ? { y: -4, rotate: -1.5 } : undefined}
                className={`rounded-3xl p-4 ${b.earned_at ? "bg-gradient-to-br from-sun-soft to-coral-soft" : "bg-surface-2"}`}
              >
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${b.earned_at ? "bg-spark text-white shadow-[var(--shadow-sm)]" : "bg-surface text-ink-faint"}`}>
                  <Icon name={b.earned_at ? "trophy" : "lock"} className="h-5 w-5" />
                </span>
                <p className={`mt-3 text-sm font-semibold ${b.earned_at ? "" : "text-ink-soft"}`}>{tn(`badge.${b.code}.name`, b.name)}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{tn(`badge.${b.code}.desc`, b.description)}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="rounded-[32px] bg-surface p-2 shadow-[var(--shadow-md)]">
          <div className="flex items-center gap-2 px-5 pb-2 pt-4">
            <h2 className="font-display text-2xl">{t("dash.history")}</h2>
          </div>
          {data.recent.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-ink-soft">{t("dash.noAnswers")}</p>
          ) : (
            <ul className="flex flex-col">
              {data.recent.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-5 py-3 text-sm transition-colors hover:bg-surface-2">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${a.is_correct ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                    <Icon name={a.is_correct ? "check" : "x"} className="h-3.5 w-3.5" />
                    <span className="sr-only">{a.is_correct ? t("dash.correct") : t("dash.wrong")}</span>
                  </span>
                  <span className="min-w-0 flex-1 truncate">{a.body}</span>
                  {a.misconception_type && <Pill tone="coral">{t(MISCONCEPTION_KEYS[a.misconception_type].title)}</Pill>}
                  <span className="w-full pl-10 text-xs text-ink-soft tabular sm:w-auto sm:pl-0">
                    {tn(a.topic)}
                    {a.from_test ? ` · ${t("dash.fromTest")}` : ""} · {new Date(a.created_at).toLocaleString(dateLocale, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
