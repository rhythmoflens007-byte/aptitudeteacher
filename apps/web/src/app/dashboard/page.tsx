"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import TutorAvatar from "@/components/TutorAvatar";
import { buttonClass, Card, CountUp, ErrorNote, Icon, IconTile, Label, MISCONCEPTION_LABEL, Pill, ProgressBar, Ring, Skeleton } from "@/components/ui";
import { api, Dashboard } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useTutor } from "@/lib/tutor";

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function masteryTone(value: number) {
  if (value >= 70) return "text-good";
  if (value >= 35) return "text-marker";
  return "text-bad";
}

const TOPIC_ICON = ["brain", "chart", "book"];

export default function DashboardPage() {
  return (
    <AppShell wide>
      <DashboardView />
    </AppShell>
  );
}

function DashboardView() {
  const { t } = useT();
  const tutor = useTutor();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  useEffect(() => {
    api<Dashboard>("/progress/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-20 w-2/3" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const { gamification: g, stats, daily_goal: goal } = data;
  const maxTrend = Math.max(1, ...data.trend.map((d) => d.attempts));
  const goalPct = (100 * goal.completed) / goal.target;
  const weakest = data.weak_skills[0];
  const tip = weakest
    ? `${weakest.name} is your weakest skill right now. Let's fix it first.`
    : stats.attempts
      ? "Great consistency. Try a mock test to see where you stand."
      : "Answer a few questions and I'll work out where to start.";

  const tiles = [
    { label: t("dash.level"), icon: "sparkles", value: <CountUp value={g.level} />, sub: `${g.xp} XP total` },
    {
      label: t("dash.streak"),
      icon: "flame",
      value: (
        <span className="flex items-baseline gap-1">
          <CountUp value={g.streak_days} />
          {g.streak_days > 0 && <span className="flame text-xl">🔥</span>}
        </span>
      ),
      sub: `Longest: ${plural(g.longest_streak_days, "day")}`,
    },
    {
      label: t("dash.accuracy"),
      icon: "target",
      value: stats.accuracy === null ? "—" : <CountUp value={stats.accuracy} suffix="%" />,
      sub: `${plural(stats.attempts, "question")} answered`,
    },
    {
      label: t("dash.speed"),
      icon: "clock",
      value: stats.avg_time_s === null ? "—" : <CountUp value={stats.avg_time_s} decimals={1} suffix="s" />,
      sub: `${stats.today} answered today`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2.5">{t("dash.greeting")}</p>
          <h1 className="font-display text-4xl sm:text-5xl">{data.user.display_name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tests" transitionTypes={["nav-forward"]} className={buttonClass("secondary")}>
            <Icon name="clipboard" className="h-4 w-4" /> Take a mock test
          </Link>
          <Link href="/practice" transitionTypes={["nav-forward"]} className={buttonClass("primary")}>
            {t("dash.goalStart")} <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rise grain relative flex items-center gap-5 overflow-hidden rounded-xl bg-navy text-navy-ink shadow-[var(--shadow-md)]">
          <TutorAvatar gender={tutor.gender} mood="happy" stage={false} className="relative hidden h-44 w-36 shrink-0 self-end sm:block" />
          <div className="relative flex min-w-0 flex-1 flex-col gap-3 p-6 sm:pl-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {tutor.name} says
            </p>
            <p className="font-display text-2xl leading-snug text-white text-balance">{tip}</p>
            <Link href="/tutor" transitionTypes={["nav-forward"]} className="link-draw flex w-fit items-center gap-1 text-sm font-medium text-white">
              Talk it through <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <Card className="rise flex items-center gap-5" style={{ "--i": 1 } as CSSProperties}>
          <Ring value={goalPct} size={104} stroke={9} tone={goal.completed >= goal.target ? "accent" : "marker"}>
            <p className="font-display text-3xl tabular">
              {goal.completed}
              <span className="text-sm text-ink-soft">/{goal.target}</span>
            </p>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Label>{t("dash.goal")}</Label>
              <Pill tone={goal.completed >= goal.target ? "good" : "neutral"}>
                {goal.completed >= goal.target ? (
                  <>
                    <Icon name="check" className="h-3.5 w-3.5" /> Done
                  </>
                ) : (
                  `${goal.target - goal.completed} to go`
                )}
              </Pill>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {goal.skills.slice(0, 4).map((s) => (
                <li key={s.id} className="flex items-center gap-2 truncate text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="truncate">{s.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <Card key={tile.label} className="rise p-4 sm:p-5" style={{ "--i": i + 2 } as CSSProperties}>
            <div className="flex items-center justify-between gap-2">
              <Label>{tile.label}</Label>
              <Icon name={tile.icon} className="h-4 w-4 text-ink-soft" />
            </div>
            <div className="mt-3 font-display text-4xl">{tile.value}</div>
            <p className="mt-1 text-xs text-ink-soft tabular">{tile.sub}</p>
            {i === 0 && (
              <div className="mt-3">
                <ProgressBar value={(100 * g.xp_into_level) / g.xp_per_level} />
                <p className="mt-1.5 text-[11px] text-ink-soft tabular">
                  {g.xp_into_level} / {g.xp_per_level} XP to level {g.level + 1}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="rise p-0" style={{ "--i": 4 } as CSSProperties}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-xl">{t("dash.mastery")}</h2>
            <span className="text-xs text-ink-soft">Tap a section for skills</span>
          </div>
          <ul className="divide-y divide-line">
            {data.topics.map((topic, ti) => (
              <li key={topic.id}>
                <button
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-surface-2/60"
                  onClick={() => setOpenTopic(openTopic === topic.id ? null : topic.id)}
                  aria-expanded={openTopic === topic.id}
                >
                  <IconTile name={TOPIC_ICON[ti % 3]} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{topic.name}</span>
                      <span className={`text-sm font-semibold tabular ${masteryTone(topic.mastery)}`}>{topic.mastery}%</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={topic.mastery} />
                    </div>
                    <p className="mt-1.5 text-xs text-ink-soft tabular">
                      {plural(topic.attempts, "attempt")}
                      {topic.accuracy !== null ? ` · ${topic.accuracy}% accuracy` : ""} · {plural(topic.skills.length, "skill")}
                    </p>
                  </div>
                  <Icon name="chevron" className={`h-4 w-4 shrink-0 text-ink-soft transition-transform duration-300 ${openTopic === topic.id ? "rotate-90" : ""}`} />
                </button>
                {openTopic === topic.id && (
                  <div className="fade overflow-x-auto px-5 pb-4">
                    <table className="w-full min-w-[440px] text-sm">
                      <thead>
                        <tr className="text-left text-xs text-ink-soft">
                          <th className="py-1.5 font-medium">Skill</th>
                          <th className="py-1.5 font-medium">Mastery</th>
                          <th className="py-1.5 text-right font-medium">Accuracy</th>
                          <th className="py-1.5 text-right font-medium">Avg time</th>
                        </tr>
                      </thead>
                      <tbody className="tabular">
                        {topic.skills.map((s) => (
                          <tr key={s.id} className="border-t border-line">
                            <td className="py-2 pr-3">
                              <span className="text-ink-soft">{s.subtopic} · </span>
                              {s.name}
                            </td>
                            <td className="w-28 py-2 pr-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <ProgressBar value={s.mastery} />
                                </div>
                                <span className={`w-9 text-right text-xs font-medium ${masteryTone(s.mastery)}`}>{s.mastery}%</span>
                              </div>
                            </td>
                            <td className="py-2 text-right">{s.accuracy === null ? "—" : `${s.accuracy}%`}</td>
                            <td className="py-2 text-right">{s.avg_time_s === null ? "—" : `${s.avg_time_s}s`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:flex xl:flex-col">
          <Card className="rise" style={{ "--i": 5 } as CSSProperties}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{t("dash.trend")}</h2>
              <span className="flex items-center gap-3 text-[11px] text-ink-soft">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-accent" />
                  correct
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-accent/25" />
                  wrong
                </span>
              </span>
            </div>
            <div className="mt-5 flex h-32 items-end gap-2 sm:gap-3" aria-label="Questions answered per day over the last 7 days">
              {data.trend.map((d, i) => {
                const day = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
                const isToday = i === data.trend.length - 1;
                return (
                  <div key={d.date} className="group flex flex-1 flex-col items-center gap-1.5" title={`${d.correct} of ${d.attempts} correct`}>
                    <span className="text-[10px] font-medium text-ink-soft tabular opacity-0 transition group-hover:opacity-100 sm:opacity-100">{d.attempts || ""}</span>
                    <div className="relative flex w-full max-w-8 flex-col justify-end overflow-hidden rounded-md bg-surface-2" style={{ height: 84 }}>
                      <div className="grow-y flex w-full flex-col justify-end" style={{ height: `${(84 * d.attempts) / maxTrend}px`, "--i": i } as CSSProperties}>
                        <div className="w-full bg-accent/25" style={{ height: `${d.attempts ? (100 * (d.attempts - d.correct)) / d.attempts : 0}%` }} />
                        <div className="w-full bg-accent" style={{ height: `${d.attempts ? (100 * d.correct) / d.attempts : 0}%` }} />
                      </div>
                    </div>
                    <span className={`text-[11px] ${isToday ? "font-semibold text-ink" : "text-ink-soft"}`}>{day}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rise flex flex-1 flex-col" style={{ "--i": 6 } as CSSProperties}>
            <h2 className="font-display text-xl">{t("dash.weak")}</h2>
            {data.weak_skills.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center text-sm text-ink-soft">
                <IconTile name="target" tone="accent" />
                Answer a few questions and your weakest skills will show up here.
              </div>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {data.weak_skills.map((s, i) => (
                  <li key={s.id} className="rise flex items-center gap-3" style={{ "--i": i } as CSSProperties}>
                    <Ring value={Math.max(s.mastery, 2)} size={40} stroke={4} tone={s.mastery < 35 ? "bad" : "marker"}>
                      <span className="text-[10px] font-semibold tabular">{s.mastery}</span>
                    </Ring>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-ink-soft tabular">
                        {s.subtopic} · {s.accuracy}% over {plural(s.attempts, "attempt")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/tutor" transitionTypes={["nav-forward"]} className={buttonClass("secondary", "mt-4 w-full")}>
              <Icon name="chat" className="h-4 w-4" /> Talk it through with {tutor.name}
            </Link>
          </Card>
        </div>
      </div>

      <Card className="rise" style={{ "--i": 7 } as CSSProperties}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{t("dash.badges")}</h2>
          <span className="text-xs text-ink-soft tabular">
            {data.badges.filter((b) => b.earned_at).length} / {data.badges.length} earned
          </span>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.badges.map((b, i) => (
            <li
              key={b.code}
              style={{ "--i": i } as CSSProperties}
              className={`pop rounded-xl border p-4 ${b.earned_at ? "lift border-line bg-surface" : "border-dashed border-line bg-surface-2/40"}`}
            >
              <IconTile name={b.earned_at ? "trophy" : "lock"} tone={b.earned_at ? "marker" : "neutral"} className={b.earned_at ? "" : "opacity-60"} />
              <p className={`mt-3 text-sm font-medium ${b.earned_at ? "" : "text-ink-soft"}`}>{b.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{b.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="rise p-0" style={{ "--i": 8 } as CSSProperties}>
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <Icon name="history" className="h-4 w-4 text-ink-soft" />
          <h2 className="font-display text-xl">{t("dash.history")}</h2>
        </div>
        {data.recent.length === 0 ? (
          <p className="px-5 py-4 text-sm text-ink-soft">No answers yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${a.is_correct ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
                  <Icon name={a.is_correct ? "check" : "x"} className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate">{a.body}</span>
                {a.misconception_type && <Pill tone="bad">{MISCONCEPTION_LABEL[a.misconception_type]?.title}</Pill>}
                <span className="w-full pl-9 text-xs text-ink-soft tabular sm:w-auto sm:pl-0">
                  {a.topic}
                  {a.from_test ? " · test" : ""} · {new Date(a.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
