"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card, ErrorNote, Label, MISCONCEPTION_LABEL, Pill, ProgressBar, Spinner } from "@/components/ui";
import { api, Dashboard } from "@/lib/api";
import { useT } from "@/lib/i18n";

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function masteryTone(value: number) {
  if (value >= 70) return "text-good";
  if (value >= 35) return "text-marker";
  return "text-bad";
}

export default function DashboardPage() {
  return (
    <AppShell wide>
      <DashboardView />
    </AppShell>
  );
}

function DashboardView() {
  const { t } = useT();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  useEffect(() => {
    api<Dashboard>("/progress/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner label="Loading your progress" />;

  const { gamification: g, stats, daily_goal: goal } = data;
  const maxTrend = Math.max(1, ...data.trend.map((d) => d.attempts));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>{t("dash.greeting")}</Label>
          <h1 className="font-display text-3xl font-semibold">{data.user.display_name}</h1>
        </div>
        <Link href="/practice" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:brightness-110">
          {t("dash.goalStart")} →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <Label>{t("dash.level")}</Label>
          <p className="mt-1 font-display text-3xl font-semibold tabular">{g.level}</p>
          <div className="mt-3">
            <ProgressBar value={(100 * g.xp_into_level) / g.xp_per_level} tone="marker" />
            <p className="mt-1.5 text-xs text-ink-soft tabular">
              {g.xp_into_level} / {g.xp_per_level} XP · {g.xp} total
            </p>
          </div>
        </Card>
        <Card>
          <Label>{t("dash.streak")}</Label>
          <p className="mt-1 font-display text-3xl font-semibold tabular">
            {g.streak_days} <span className="text-base text-marker">{g.streak_days > 0 ? "🔥" : ""}</span>
          </p>
          <p className="mt-3 text-xs text-ink-soft tabular">Longest: {plural(g.longest_streak_days, "day")}</p>
        </Card>
        <Card>
          <Label>{t("dash.accuracy")}</Label>
          <p className="mt-1 font-display text-3xl font-semibold tabular">{stats.accuracy === null ? "—" : `${stats.accuracy}%`}</p>
          <p className="mt-3 text-xs text-ink-soft tabular">{stats.attempts} questions answered</p>
        </Card>
        <Card>
          <Label>{t("dash.speed")}</Label>
          <p className="mt-1 font-display text-3xl font-semibold tabular">{stats.avg_time_s === null ? "—" : `${stats.avg_time_s}s`}</p>
          <p className="mt-3 text-xs text-ink-soft tabular">{stats.today} answered today</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <Label>{t("dash.goal")}</Label>
            <span className="text-sm font-medium tabular">
              {goal.completed} / {goal.target}
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar value={(100 * goal.completed) / goal.target} />
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            {goal.completed >= goal.target ? "Goal complete — anything more is bonus XP." : "Today's questions focus on these skills:"}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {goal.skills.map((s) => (
              <li key={s.id}>
                <Pill tone="accent">
                  {s.subtopic}: {s.name}
                </Pill>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <Label>{t("dash.trend")}</Label>
          <div className="mt-4 flex h-28 items-end gap-2" aria-label="Questions answered per day over the last 7 days">
            {data.trend.map((d) => {
              const day = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.correct} of ${d.attempts} correct`}>
                  <span className="text-[10px] text-ink-soft tabular">{d.attempts || ""}</span>
                  <div className="relative flex w-full max-w-8 flex-col justify-end overflow-hidden rounded-md bg-surface-2" style={{ height: 72 }}>
                    <div className="w-full bg-accent/35" style={{ height: `${(72 * (d.attempts - d.correct)) / maxTrend}px` }} />
                    <div className="w-full bg-accent" style={{ height: `${(72 * d.correct) / maxTrend}px` }} />
                  </div>
                  <span className="text-[10px] text-ink-soft">{day}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent" />correct
            <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-accent/35" />incorrect
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <Label>{t("dash.mastery")}</Label>
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {data.topics.map((topic) => (
              <li key={topic.id} className="py-3">
                <button
                  className="flex w-full items-center gap-4 text-left"
                  onClick={() => setOpenTopic(openTopic === topic.id ? null : topic.id)}
                  aria-expanded={openTopic === topic.id}
                >
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium">{topic.name}</span>
                      <span className={`text-sm font-semibold tabular ${masteryTone(topic.mastery)}`}>{topic.mastery}%</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={topic.mastery} />
                    </div>
                    <p className="mt-1 text-xs text-ink-soft tabular">
                      {plural(topic.attempts, "attempt")}{topic.accuracy !== null ? ` · ${topic.accuracy}% accuracy` : ""}
                    </p>
                  </div>
                  <span className="text-ink-soft">{openTopic === topic.id ? "▴" : "▾"}</span>
                </button>
                {openTopic === topic.id && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="text-left text-xs text-ink-soft">
                          <th className="py-1.5 font-medium">Skill</th>
                          <th className="py-1.5 text-right font-medium">Mastery</th>
                          <th className="py-1.5 text-right font-medium">Accuracy</th>
                          <th className="py-1.5 text-right font-medium">Avg time</th>
                        </tr>
                      </thead>
                      <tbody className="tabular">
                        {topic.skills.map((s) => (
                          <tr key={s.id} className="border-t border-line">
                            <td className="py-2">
                              <span className="text-ink-soft">{s.subtopic} · </span>
                              {s.name}
                            </td>
                            <td className={`py-2 text-right font-medium ${masteryTone(s.mastery)}`}>{s.mastery}%</td>
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
        <Card>
          <Label>{t("dash.weak")}</Label>
          {data.weak_skills.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Answer a few questions and your weakest skills will show up here.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {data.weak_skills.map((s) => (
                <li key={s.id}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>
                      {s.name} <span className="text-ink-soft">· {s.subtopic}</span>
                    </span>
                    <span className={`font-semibold tabular ${masteryTone(s.mastery)}`}>{s.mastery}%</span>
                  </div>
                  <p className="text-xs text-ink-soft tabular">
                    {s.accuracy}% accuracy over {plural(s.attempts, "attempt")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/tutor" className="mt-4 inline-block text-sm font-medium text-accent">
            Talk it through with Asha →
          </Link>
        </Card>
      </div>

      <Card>
        <Label>{t("dash.badges")}</Label>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.badges.map((b) => (
            <li
              key={b.code}
              className={`rounded-xl border p-3 ${b.earned_at ? "border-marker/40 bg-marker-soft" : "border-dashed border-line opacity-60"}`}
            >
              <p className="text-sm font-medium">{b.earned_at ? "🏅 " : "🔒 "}{b.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{b.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <Label>{t("dash.history")}</Label>
        {data.recent.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No answers yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {data.recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <Pill tone={a.is_correct ? "good" : "bad"}>{a.is_correct ? "Correct" : "Wrong"}</Pill>
                <span className="min-w-0 flex-1 truncate">{a.body}</span>
                {a.misconception_type && <span className="text-xs text-ink-soft">{MISCONCEPTION_LABEL[a.misconception_type]?.title}</span>}
                <span className="text-xs text-ink-soft tabular">
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
