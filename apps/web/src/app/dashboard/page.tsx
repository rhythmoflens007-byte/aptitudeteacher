"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import TutorAvatar from "@/components/TutorAvatar";
import { Card, CountUp, ErrorNote, Icon, Label, MISCONCEPTION_LABEL, Pill, ProgressBar, Ring, Skeleton } from "@/components/ui";
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

const TOPIC_STYLE = ["bg-brand", "bg-sunrise", "bg-[linear-gradient(135deg,var(--violet),#9b8cf2)]"];

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
        <Skeleton className="h-44" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
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
    { label: t("dash.level"), icon: "sparkles", tone: "bg-brand", value: <CountUp value={g.level} />, sub: `${g.xp} XP total` },
    {
      label: t("dash.streak"),
      icon: "flame",
      tone: "bg-sunrise",
      value: (
        <span className="flex items-baseline gap-1">
          <CountUp value={g.streak_days} />
          {g.streak_days > 0 && <span className="flame text-2xl">🔥</span>}
        </span>
      ),
      sub: `Longest: ${plural(g.longest_streak_days, "day")}`,
    },
    {
      label: t("dash.accuracy"),
      icon: "target",
      tone: "bg-[linear-gradient(135deg,var(--violet),#9b8cf2)]",
      value: stats.accuracy === null ? "—" : <CountUp value={stats.accuracy} suffix="%" />,
      sub: `${plural(stats.attempts, "question")} answered`,
    },
    {
      label: t("dash.speed"),
      icon: "clock",
      tone: "bg-[linear-gradient(135deg,#2a8fbd,#5cc4e8)]",
      value: stats.avg_time_s === null ? "—" : <CountUp value={stats.avg_time_s} decimals={1} suffix="s" />,
      sub: `${stats.today} answered today`,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-[2rem] bg-brand p-6 text-accent-ink shadow-[var(--shadow-lg)] sm:p-8">
        <span aria-hidden className="absolute -right-10 -top-24 h-64 w-64 rounded-full bg-white/10" />
        <span aria-hidden className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-white/10" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium opacity-80">{t("dash.greeting")}</p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{data.user.display_name}</h1>
            <div className="max-w-md rounded-2xl rounded-tl-sm bg-white/15 px-4 py-3 text-sm backdrop-blur">
              <p className="text-xs font-semibold opacity-80">{tutor.name} says</p>
              <p className="mt-0.5">{tip}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/practice" className="press shine inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0f5c42] shadow-[var(--shadow-lg)]">
                {t("dash.goalStart")} <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link href="/tests" className="press inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-sm font-medium hover:bg-white/25">
                <Icon name="clipboard" className="h-4 w-4" /> Take a mock test
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <TutorAvatar gender={tutor.gender} mood="happy" stage={false} className="hidden h-44 w-44 sm:block" />
            <Ring value={goalPct} size={124} stroke={11} tone="marker">
              <div>
                <p className="font-display text-3xl font-semibold tabular">
                  {goal.completed}
                  <span className="text-base opacity-70">/{goal.target}</span>
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{t("dash.goal")}</p>
              </div>
            </Ring>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <Card key={tile.label} hover className="rise p-4 sm:p-5" style={{ "--i": i } as CSSProperties}>
            <div className="flex items-start justify-between gap-2">
              <Label>{tile.label}</Label>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-[var(--shadow-sm)] ${tile.tone}`}>
                <Icon name={tile.icon} className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{tile.value}</div>
            <p className="mt-1 text-xs text-ink-soft tabular">{tile.sub}</p>
            {i === 0 && (
              <div className="mt-3">
                <ProgressBar value={(100 * g.xp_into_level) / g.xp_per_level} tone="marker" />
                <p className="mt-1 text-[11px] text-ink-soft tabular">
                  {g.xp_into_level} / {g.xp_per_level} XP to level {g.level + 1}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card className="rise" style={{ "--i": 2 } as CSSProperties}>
          <div className="flex items-center justify-between">
            <Label>{t("dash.goal")}</Label>
            <Pill tone={goal.completed >= goal.target ? "good" : "marker"}>
              {goal.completed >= goal.target ? (
                <>
                  <Icon name="check" className="h-3.5 w-3.5" /> Complete
                </>
              ) : (
                `${goal.target - goal.completed} to go`
              )}
            </Pill>
          </div>
          <div className="mt-4">
            <ProgressBar value={goalPct} thick />
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            {goal.completed >= goal.target ? "Goal complete — anything more is bonus XP." : "Today's questions focus on these skills:"}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {goal.skills.map((s, i) => (
              <li key={s.id} className="pop" style={{ "--i": i + 3 } as CSSProperties}>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2/60 px-3 py-1.5 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="text-ink-soft">{s.subtopic}:</span> {s.name}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="rise" style={{ "--i": 3 } as CSSProperties}>
          <div className="flex items-center justify-between">
            <Label>{t("dash.trend")}</Label>
            <span className="flex items-center gap-3 text-[11px] text-ink-soft">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-accent" />
                correct
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-accent/30" />
                wrong
              </span>
            </span>
          </div>
          <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3" aria-label="Questions answered per day over the last 7 days">
            {data.trend.map((d, i) => {
              const day = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
              const isToday = i === data.trend.length - 1;
              return (
                <div key={d.date} className="group flex flex-1 flex-col items-center gap-1.5" title={`${d.correct} of ${d.attempts} correct`}>
                  <span className="text-[10px] font-medium text-ink-soft tabular opacity-0 transition group-hover:opacity-100 sm:opacity-100">{d.attempts || ""}</span>
                  <div className="relative flex w-full max-w-9 flex-col justify-end overflow-hidden rounded-lg bg-surface-2" style={{ height: 96 }}>
                    <div className="grow-y flex w-full flex-col justify-end" style={{ height: `${(96 * d.attempts) / maxTrend}px`, "--i": i } as CSSProperties}>
                      <div className="w-full bg-accent/30" style={{ height: `${d.attempts ? (100 * (d.attempts - d.correct)) / d.attempts : 0}%` }} />
                      <div className="w-full bg-brand" style={{ height: `${d.attempts ? (100 * d.correct) / d.attempts : 0}%` }} />
                    </div>
                  </div>
                  <span className={`text-[11px] ${isToday ? "font-semibold text-accent" : "text-ink-soft"}`}>{day}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="rise" style={{ "--i": 4 } as CSSProperties}>
          <Label>{t("dash.mastery")}</Label>
          <ul className="mt-3 flex flex-col gap-2">
            {data.topics.map((topic, ti) => (
              <li key={topic.id} className="rounded-2xl border border-transparent transition hover:border-line hover:bg-surface-2/40">
                <button
                  className="flex w-full items-center gap-4 p-3 text-left"
                  onClick={() => setOpenTopic(openTopic === topic.id ? null : topic.id)}
                  aria-expanded={openTopic === topic.id}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-[var(--shadow-sm)] ${TOPIC_STYLE[ti % 3]}`}>
                    <Icon name={["brain", "chart", "book"][ti % 3]} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{topic.name}</span>
                      <span className={`text-sm font-semibold tabular ${masteryTone(topic.mastery)}`}>{topic.mastery}%</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={topic.mastery} />
                    </div>
                    <p className="mt-1 text-xs text-ink-soft tabular">
                      {plural(topic.attempts, "attempt")}
                      {topic.accuracy !== null ? ` · ${topic.accuracy}% accuracy` : ""} · {plural(topic.skills.length, "skill")}
                    </p>
                  </div>
                  <span className={`text-ink-soft transition-transform duration-300 ${openTopic === topic.id ? "rotate-90" : ""}`}>
                    <Icon name="arrow" className="h-4 w-4" />
                  </span>
                </button>
                {openTopic === topic.id && (
                  <div className="fade overflow-x-auto px-3 pb-3">
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

        <Card className="rise flex flex-col" style={{ "--i": 5 } as CSSProperties}>
          <Label>{t("dash.weak")}</Label>
          {data.weak_skills.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-sm text-ink-soft">
              <Icon name="target" className="h-8 w-8 text-accent" />
              Answer a few questions and your weakest skills will show up here.
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {data.weak_skills.map((s, i) => (
                <li key={s.id} className="rise flex items-center gap-3" style={{ "--i": i } as CSSProperties}>
                  <Ring value={Math.max(s.mastery, 2)} size={44} stroke={5} tone={s.mastery < 35 ? "bad" : "marker"}>
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
          <Link href="/tutor" className="press mt-auto flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 pt-2.5 text-sm font-medium text-accent hover:bg-accent-soft">
            <Icon name="chat" className="h-4 w-4" /> Talk it through with {tutor.name}
          </Link>
        </Card>
      </div>

      <Card className="rise" style={{ "--i": 6 } as CSSProperties}>
        <div className="flex items-center justify-between">
          <Label>{t("dash.badges")}</Label>
          <span className="text-xs text-ink-soft tabular">
            {data.badges.filter((b) => b.earned_at).length} / {data.badges.length} earned
          </span>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.badges.map((b, i) => (
            <li
              key={b.code}
              style={{ "--i": i } as CSSProperties}
              className={`pop relative overflow-hidden rounded-2xl border p-4 transition ${
                b.earned_at ? "lift shine border-marker/40 bg-marker-soft" : "border-dashed border-line bg-surface-2/40 grayscale"
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${b.earned_at ? "bg-sunrise shadow-[var(--shadow-md)]" : "bg-ink-soft/40"}`}>
                <Icon name={b.earned_at ? "trophy" : "sparkles"} className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold">{b.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{b.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="rise" style={{ "--i": 7 } as CSSProperties}>
        <div className="flex items-center gap-2">
          <Icon name="history" className="h-4 w-4 text-ink-soft" />
          <Label>{t("dash.history")}</Label>
        </div>
        {data.recent.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No answers yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {data.recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${a.is_correct ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
                  <Icon name={a.is_correct ? "check" : "x"} className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate">{a.body}</span>
                {a.misconception_type && <Pill tone="bad">{MISCONCEPTION_LABEL[a.misconception_type]?.title}</Pill>}
                <span className="w-full pl-10 text-xs text-ink-soft tabular sm:w-auto sm:pl-0">
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
