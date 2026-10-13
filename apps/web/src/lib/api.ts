export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "aptitude.token";

export type Locale = "en" | "hi" | "ta" | "te";

export type User = {
  id: string;
  email: string;
  display_name: string;
  locale: Locale;
  tutor_name: string;
  tutor_gender: "female" | "male";
};

export type Question = {
  id: string;
  body: string;
  options: string[];
  difficulty: number;
  topic: string;
  subtopic: string;
  skills: string[];
  source: string;
};

export type Topic = {
  id: string;
  name: string;
  slug: string;
  subtopics: { id: string; name: string; skills: { id: string; name: string }[] }[];
};

export type Badge = { code: string; name: string; description: string; earned_at?: string | null };

export type AttemptResult = {
  is_correct: boolean;
  correct_option: string;
  explanation: string;
  misconception_type: Misconception | null;
  micro_lesson: string | null;
  retest_question_id: string | null;
  xp_gained: number;
  mastery: { skill: string; score: number }[];
  new_badges: Badge[];
  daily_goal_completed: number;
  daily_goal_target: number;
};

export type Misconception = "careless_slip" | "conceptual_gap" | "partial_method" | "no_attempt";

export type Quiz = {
  id: string;
  kind: "quiz" | "mock";
  duration_seconds: number;
  started_at: string;
  questions: Question[];
};

export type QuizReport = {
  id: string;
  kind: "quiz" | "mock";
  score: number;
  total: number;
  accuracy: number;
  time_used_ms: number;
  duration_seconds: number;
  sections: { topic: string; correct: number; total: number; time_ms: number }[];
  weak_skills: { skill: string; missed: number }[];
  questions: {
    question: Question;
    chosen_answer: string | null;
    correct_option: string;
    is_correct: boolean;
    time_taken_ms: number | null;
    explanation: string;
  }[];
};

export type TutorMessage = { id: string; role: "student" | "tutor"; content: string; emotions?: string[]; created_at: string };

export type TutorSession = {
  id: string;
  title: string;
  question_id: string | null;
  question_text: string | null;
  started_at: string;
  messages: TutorMessage[];
};

export type SkillStat = {
  id: string;
  name: string;
  subtopic: string;
  mastery: number;
  attempts: number;
  accuracy: number | null;
  avg_time_s: number | null;
};

export type Dashboard = {
  user: { display_name: string; locale: Locale };
  stats: { attempts: number; accuracy: number | null; avg_time_s: number | null; today: number };
  gamification: {
    xp: number;
    level: number;
    xp_into_level: number;
    xp_per_level: number;
    streak_days: number;
    longest_streak_days: number;
  };
  daily_goal: { target: number; completed: number; skills: { id: string; name: string; subtopic: string }[] };
  topics: { id: string; name: string; mastery: number; attempts: number; accuracy: number | null; skills: SkillStat[] }[];
  weak_skills: SkillStat[];
  badges: Badge[];
  trend: { date: string; attempts: number; correct: number }[];
  recent: {
    id: string;
    body: string;
    topic: string;
    is_correct: boolean;
    misconception_type: Misconception | null;
    time_taken_ms: number | null;
    created_at: string;
    from_test: boolean;
  }[];
};

/** offline: no connection or server down · timeout · server: 5xx · rate: 429 · client: other 4xx (message from the API). */
export type ApiErrorKind = "offline" | "timeout" | "server" | "rate" | "client";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public kind: ApiErrorKind = status === 0 ? "offline" : status >= 500 ? "server" : status === 429 ? "rate" : "client",
  ) {
    super(message);
  }
}

/* Whether the backend is reachable, so a banner can say so and retry. */
type Connection = "ok" | "down";
let connection: Connection = "ok";
let recoveredAt = 0;
const connectionListeners = new Set<() => void>();

function setConnection(next: Connection) {
  if (next === connection) return;
  if (next === "ok") recoveredAt = Date.now();
  connection = next;
  connectionListeners.forEach((listener) => listener());
}

/** When the backend last came back after being unreachable (0 if never). */
export function getRecoveredAt() {
  return recoveredAt;
}

export function subscribeConnection(listener: () => void) {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}

export function getConnection() {
  return connection;
}

/** Pings the backend; resolves true when it answers. */
export async function checkConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    setConnection(res.ok ? "ok" : "down");
    return res.ok;
  } catch {
    setConnection("down");
    return false;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

const DEFAULT_TIMEOUT_MS = 20_000;

async function send(path: string, init: RequestInit & { json?: unknown; timeoutMs?: number }) {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, headers, body, signal: init.signal ?? controller.signal });
    setConnection("ok");
    if (res.status === 401 && token) onUnauthorized?.();
    return res;
  } catch (e) {
    if (controller.signal.aborted) throw new ApiError(0, "The request took too long.", "timeout");
    setConnection("down");
    throw new ApiError(0, e instanceof Error ? e.message : "Network error", "offline");
  } finally {
    clearTimeout(timer);
  }
}

async function failure(res: Response): Promise<ApiError> {
  const data = await res.json().catch(() => null);
  const detail = data?.detail;
  const message =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: { msg: string }) => d.msg.replace(/^Value error, /, "")).join(" ")
        : "";
  return new ApiError(res.status, message);
}

/**
 * Streams newline-delimited JSON events (used for tutor replies), calling `onEvent` for each line
 * as it arrives. The overall timeout is generous because the AI keeps writing for a while.
 */
export async function apiStream<E>(path: string, json: unknown, onEvent: (event: E) => void, timeoutMs = 90_000): Promise<void> {
  const res = await send(path, { method: "POST", json, timeoutMs });
  if (!res.ok) throw await failure(res);
  if (!res.body) throw new ApiError(0, "No response body", "server");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as E);
      newline = buffer.indexOf("\n");
    }
    if (done) break;
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as E);
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const res = await send(path, init);
  if (!res.ok) throw await failure(res);
  return (res.status === 204 ? null : await res.json()) as T;
}
