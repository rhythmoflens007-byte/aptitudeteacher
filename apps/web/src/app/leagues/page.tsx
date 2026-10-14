"use client";

import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { FadeIn } from "@/components/motion";
import { useToast } from "@/components/Toast";
import { Button, ErrorNote, ErrorState, Icon, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { Friend, LEAGUE_COLORS, LEAGUES, LeagueBoard, timeUntil } from "@/lib/game";
import { useT } from "@/lib/i18n";

export default function LeaguesPage() {
  return (
    <AppShell wide>
      <Leagues />
    </AppShell>
  );
}

function Leagues() {
  const { t } = useT();
  const [tab, setTab] = useState<"league" | "friends">("league");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("league.eyebrow")}
        title={t("league.title")}
        actions={
          <Segmented
            id="league-tab"
            label={t("league.title")}
            value={tab}
            options={[
              { value: "league", label: t("league.tabLeague") },
              { value: "friends", label: t("league.tabFriends") },
            ]}
            onChange={setTab}
          />
        }
      />
      {tab === "league" ? <Board /> : <Friends />}
    </div>
  );
}

function Shield({ league, size = 64 }: { league: LeagueBoard["league"]; size?: number }) {
  const color = LEAGUE_COLORS[league];
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 64 74" aria-hidden>
      <defs>
        <linearGradient id={`shield-${league}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.75" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <path d="M32 3 58 12v22c0 18-12 30-26 37C18 64 6 52 6 34V12z" fill={`url(#shield-${league})`} stroke="white" strokeOpacity=".5" strokeWidth="2" />
      <path d="m32 22 4.4 9 9.9 1.4-7.2 7 1.7 9.8L32 44.6l-8.8 4.6 1.7-9.8-7.2-7 9.9-1.4z" fill="white" fillOpacity=".92" />
    </svg>
  );
}

function Board() {
  const { t, errorText } = useT();
  const [board, setBoard] = useState<LeagueBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<LeagueBoard>("/game/league")
      .then(setBoard)
      .catch((e) => setError(errorText(e)));
  }, [errorText]);

  if (error && !board) return <ErrorState message={error} onRetry={() => location.reload()} />;
  if (!board) return <Skeleton className="h-96 rounded-[32px]" />;

  const left = timeUntil(board.ends_at);
  const zone = (rank: number) => (rank <= board.promote ? "up" : board.demote && rank > board.size - board.demote ? "down" : null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <FadeIn>
        <section className="rounded-[32px] bg-surface p-5 shadow-[var(--shadow-md)] ring-1 ring-hairline sm:p-6" aria-labelledby="board-title">
          <div className="flex items-center gap-4">
            <Shield league={board.league} />
            <div className="min-w-0 flex-1">
              <h2 id="board-title" className="font-display text-2xl">
                {t("league.name", { league: t(`league.${board.league}`) })}
              </h2>
              <p className="text-sm text-ink-soft">
                {board.promote ? t("league.promoteNote", { n: board.promote }) : t("league.topNote")} · {left ? t("league.endsIn", { d: left.d, h: left.h }) : ""}
              </p>
            </div>
          </div>
          <ol className="mt-6 flex flex-col gap-1.5">
            {board.members.map((m, i) => {
              const z = zone(m.rank);
              const previousZone = i > 0 ? zone(board.members[i - 1].rank) : null;
              return (
                <li key={`${m.rank}-${m.name}`}>
                  {z === "down" && previousZone !== "down" && <Divider label={t("league.demoteZone")} tone="text-danger" />}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.03 }}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${m.me ? "bg-iris-soft ring-2 ring-iris" : "hover:bg-surface-2"}`}
                  >
                    <span className={`w-7 text-center font-display text-lg tabular ${z === "up" ? "text-success" : z === "down" ? "text-danger" : "text-ink-soft"}`}>{m.rank}</span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-spark text-sm font-bold text-white" aria-hidden>
                      {m.name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {m.name} {m.me && <span className="text-xs font-semibold text-iris-600">({t("league.you")})</span>}
                      </span>
                      <span className="text-xs text-ink-soft">{t("league.level", { n: m.level })}</span>
                    </span>
                    <span className="font-bold tabular">{m.xp} XP</span>
                  </motion.div>
                  {z === "up" && zone(board.members[i + 1]?.rank ?? 0) !== "up" && <Divider label={t("league.promoteZone")} tone="text-success" />}
                </li>
              );
            })}
          </ol>
          {board.size <= 1 && <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-ink-soft">{t("league.alone")}</p>}
        </section>
      </FadeIn>
      <FadeIn delay={0.08}>
        <aside className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-md)] ring-1 ring-hairline">
          <h2 className="font-display text-xl">{t("league.ladder")}</h2>
          <ol className="mt-4 flex flex-col-reverse gap-2">
            {LEAGUES.map((l, i) => (
              <li key={l} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${l === board.league ? "bg-surface-2 font-semibold" : "text-ink-soft"}`} aria-current={l === board.league ? "true" : undefined}>
                <Shield league={l} size={28} />
                <span className="flex-1">{t(`league.${l}`)}</span>
                <span className="text-xs tabular">{i + 1}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">{t("league.how")}</p>
        </aside>
      </FadeIn>
    </div>
  );
}

function Divider({ label, tone }: { label: string; tone: string }) {
  return (
    <div className={`my-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${tone}`}>
      <span className="h-px flex-1 bg-current opacity-30" />
      {label}
      <span className="h-px flex-1 bg-current opacity-30" />
    </div>
  );
}

function Friends() {
  const { t, errorText } = useT();
  const toast = useToast();
  const [data, setData] = useState<{ my_code: string; friends: Friend[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ my_code: string; friends: Friend[] }>("/game/friends")
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, [errorText]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const friend = await api<Friend>("/game/friends", { method: "POST", json: { code } });
      setData((d) => (d ? { ...d, friends: [...d.friends, friend].sort((a, b) => b.weekly_xp - a.weekly_xp) } : d));
      setCode("");
      toast({ title: t("friends.added", { name: friend.name }), icon: "users", tone: "lagoon" });
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(friend: Friend) {
    await api(`/game/friends/${friend.id}`, { method: "DELETE" }).catch(() => {});
    setData((d) => (d ? { ...d, friends: d.friends.filter((f) => f.id !== friend.id) } : d));
  }

  async function share() {
    if (!data) return;
    const text = t("friends.shareText", { code: data.my_code });
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(data.my_code);
        toast({ title: t("friends.copied"), icon: "copy", tone: "iris" });
      }
    } catch {
      /* cancelled */
    }
  }

  if (error && !data) return <ErrorState message={error} onRetry={() => location.reload()} />;
  if (!data) return <Skeleton className="h-80 rounded-[32px]" />;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <FadeIn>
        <section className="rounded-[32px] bg-surface p-5 shadow-[var(--shadow-md)] ring-1 ring-hairline sm:p-6" aria-labelledby="friends-title">
          <h2 id="friends-title" className="font-display text-2xl">
            {t("friends.thisWeek")}
          </h2>
          <ol className="mt-5 flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {data.friends.map((f, i) => (
                <motion.li key={f.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${f.me ? "bg-iris-soft" : "hover:bg-surface-2"}`}>
                  <span className="w-6 text-center font-display text-lg tabular text-ink-soft">{i + 1}</span>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-spark text-sm font-bold text-white" aria-hidden>
                    {f.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {f.name} {f.me && <span className="text-xs font-semibold text-iris-600">({t("league.you")})</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
                      <span>🔥 {t("friends.streak", { n: f.streak_days })}</span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: LEAGUE_COLORS[f.league] }} aria-hidden /> {t(`league.${f.league}`)}
                      </span>
                    </span>
                  </span>
                  <span className="font-bold tabular">{f.weekly_xp} XP</span>
                  {!f.me && (
                    <button onClick={() => void remove(f)} aria-label={t("friends.remove", { name: f.name })} title={t("friends.remove", { name: f.name })} className="press grid h-8 w-8 place-items-center rounded-full text-ink-faint hover:bg-surface-2 hover:text-danger">
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          {data.friends.length <= 1 && <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-ink-soft">{t("friends.empty")}</p>}
        </section>
      </FadeIn>
      <FadeIn delay={0.08}>
        <aside className="flex flex-col gap-5">
          <div className="rounded-[28px] bg-gradient-to-br from-iris to-violet p-5 text-white shadow-[var(--shadow-md)]">
            <p className="text-sm font-semibold text-white/85">{t("friends.yourCode")}</p>
            <p className="mt-1 font-display text-4xl tracking-[0.2em]" aria-label={data.my_code.split("").join(" ")}>
              {data.my_code}
            </p>
            <button onClick={() => void share()} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-2.5 text-sm font-bold text-coal">
              <Icon name="share" className="h-4 w-4" /> {t("friends.share")}
            </button>
          </div>
          <form onSubmit={add} className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-md)] ring-1 ring-hairline">
            <label htmlFor="friend-code" className="font-display text-xl">
              {t("friends.add")}
            </label>
            <p className="mt-1 text-xs text-ink-soft">{t("friends.addNote")}</p>
            <input
              id="friend-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
              placeholder="ABC234"
              autoComplete="off"
              className="mt-3 w-full rounded-2xl bg-surface-2 px-4 py-3 text-center font-display text-2xl uppercase tracking-[0.2em] outline-none ring-1 ring-hairline focus-visible:ring-2 focus-visible:ring-iris"
            />
            <div className="mt-3">
              <ErrorNote message={formError} />
            </div>
            <Button type="submit" variant="primary" disabled={code.length < 4 || busy} className="mt-1 w-full py-3">
              <Icon name="plus" className="h-4 w-4" /> {t("friends.follow")}
            </Button>
          </form>
        </aside>
      </FadeIn>
    </div>
  );
}
