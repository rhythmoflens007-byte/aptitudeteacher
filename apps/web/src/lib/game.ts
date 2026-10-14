"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api, Question } from "@/lib/api";

export type GameStatus = {
  hearts: number;
  max_hearts: number;
  next_heart_at: string | null;
  xp: number;
  level: number;
  streak_days: number;
  league: League;
  quests_done: number;
  quests_unclaimed: number;
};

export type League = "bronze" | "silver" | "gold" | "platinum" | "diamond";
export const LEAGUES: League[] = ["bronze", "silver", "gold", "platinum", "diamond"];
export const LEAGUE_COLORS: Record<League, string> = {
  bronze: "#c47a3a",
  silver: "#8d97a8",
  gold: "#f5a524",
  platinum: "#14b8a6",
  diamond: "#5b5bf5",
};

export type LessonState = "done" | "current" | "locked";
export type Lesson = { key: string; kind: "skill" | "checkpoint"; skill: string | null; skill_id: string | null; level: 1 | 2 | 3 | null; state: LessonState; stars: number };
export type Unit = { id: string; name: string; lessons: Lesson[]; done: number; total: number };
export type Section = { id: string; name: string; slug: string; units: Unit[]; done: number; total: number };
export type Course = { sections: Section[]; hearts: number; max_hearts: number; next_heart_at: string | null };

export type Quest = { code: "xp" | "lessons" | "perfect" | "in_a_row" | "minutes"; target: number; progress: number; done: boolean; claimed: boolean; reward: number };

export type LessonStart = {
  run_id: string;
  lesson: Lesson & { unit: string };
  questions: Question[];
  hearts: number;
  max_hearts: number;
  next_heart_at: string | null;
};

export type LessonSummary = {
  run_id: string;
  completed: boolean;
  stars: number;
  correct: number;
  total: number;
  accuracy: number;
  answered: number;
  xp: number;
  time_ms: number;
  next_key: string | null;
  streak_days: number;
  quests: Quest[];
  new_badges: { code: string; name: string; description: string }[];
  hearts: number;
  max_hearts: number;
  next_heart_at: string | null;
};

export type LeagueBoard = {
  tier: number;
  league: League;
  week_start: string;
  ends_at: string;
  promote: number;
  demote: number;
  size: number;
  members: { rank: number; name: string; xp: number; level: number; me: boolean }[];
};

export type Friend = { id: string; name: string; level: number; streak_days: number; weekly_xp: number; league: League; me: boolean };

// One shared copy of the top-bar numbers, refreshed after anything that changes them.
let status: GameStatus | null = null;
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

export function refreshGame(): Promise<void> {
  inflight ??= api<GameStatus>("/game/status")
    .then((s) => {
      status = s;
      listeners.forEach((l) => l());
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Lets a screen show new numbers straight away (e.g. hearts from an answer) before the next refresh. */
export function patchGame(patch: Partial<GameStatus>) {
  if (!status) return;
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function useGameStatus(): GameStatus | null {
  const value = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => status,
    () => null,
  );
  useEffect(() => {
    if (!status) void refreshGame();
    const onFocus = () => void refreshGame();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return value;
}

/** "3h 20m" until a time, for the heart refill and the league countdown. */
export function timeUntil(iso: string | null, now = Date.now()): { d: number; h: number; m: number } | null {
  if (!iso) return null;
  const ms = Math.max(0, new Date(iso).getTime() - now);
  return { d: Math.floor(ms / 86_400_000), h: Math.floor((ms % 86_400_000) / 3_600_000), m: Math.ceil((ms % 3_600_000) / 60_000) };
}
