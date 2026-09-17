export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "aptitude.token";

export type Locale = "en" | "hi" | "bn" | "te" | "mr" | "ta" | "ur" | "gu" | "kn" | "ml" | "pa" | "es" | "fr" | "ar";

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

export type TutorMessage = { id: string; role: "student" | "tutor"; content: string; created_at: string };

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

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
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

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, body });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the backend is running on port 8000.");
  }

  if (res.status === 401 && token) onUnauthorized?.();
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg: string }) => d.msg.replace(/^Value error, /, "")).join(" ")
          : "Something went wrong. Please try again.";
    throw new ApiError(res.status, message);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}
