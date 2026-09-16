"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Avatar, { Mood } from "@/components/Avatar";
import { Button, Card, DIFFICULTY, ErrorNote, Label, MISCONCEPTION_LABEL, Pill, ProgressBar, Spinner } from "@/components/ui";
import { api, AttemptResult, Question, Topic, TutorSession } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { speak, stopSpeaking, Viseme, visemeFor } from "@/lib/speech";

type Reason = "retest" | "weakest_skill" | "new_skill";

const REASON_TEXT: Record<Reason, string> = {
  retest: "Re-test: checking that idea again",
  weakest_skill: "Focus: one of your weakest skills",
  new_skill: "New skill to explore",
};

export default function PracticePage() {
  return (
    <AppShell>
      <Practice />
    </AppShell>
  );
}

function Practice() {
  const { t, speechLang } = useT();
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [reason, setReason] = useState<Reason>("new_skill");
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  const [speaking, setSpeaking] = useState(false);
  const [viseme, setViseme] = useState<Viseme>("rest");
  const [wordTick, setWordTick] = useState(0);

  const show = useCallback((q: Question, r: Reason) => {
    stopSpeaking();
    setQuestion(q);
    setReason(r);
    setSelected(null);
    setResult(null);
    setError(null);
    startedAt.current = Date.now();
    setElapsed(0);
  }, []);

  const fetchNext = useCallback(
    async (topic: string | null) => {
      try {
        const res = await api<{ question: Question; reason: Reason }>(`/questions/next${topic ? `?topic_id=${topic}` : ""}`);
        show(res.question, res.reason);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load a question.");
      } finally {
        setBusy(false);
      }
    },
    [show],
  );

  function loadNext(topic: string | null) {
    setBusy(true);
    fetchNext(topic);
  }

  useEffect(() => {
    api<Topic[]>("/topics").then(setTopics).catch(() => {});
    api<{ question: Question; reason: Reason }>("/questions/next")
      .then((res) => show(res.question, res.reason))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
    return () => stopSpeaking();
  }, [show]);

  useEffect(() => {
    if (!question || result) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [question, result]);

  const submit = useCallback(
    async (answer: string | null) => {
      if (!question || result || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await api<AttemptResult>("/attempts", {
          method: "POST",
          json: { question_id: question.id, chosen_answer: answer, time_taken_ms: Date.now() - startedAt.current },
        });
        setSelected(answer);
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't submit your answer.");
      } finally {
        setBusy(false);
      }
    },
    [question, result, busy],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!question || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (!result && n >= 1 && n <= question.options.length) setSelected(question.options[n - 1]);
      if (e.key === "Enter" && !result && selected) submit(selected);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, result, selected, submit]);

  async function retest() {
    if (!result?.retest_question_id) return;
    setBusy(true);
    try {
      show(await api<Question>(`/questions/${result.retest_question_id}`), "retest");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the follow-up question.");
    } finally {
      setBusy(false);
    }
  }

  async function askTutor() {
    if (!question) return;
    try {
      const session = await api<TutorSession>("/tutor/sessions", { method: "POST", json: { question_id: question.id } });
      router.push(`/tutor?session=${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the tutor.");
    }
  }

  function listen(text: string) {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(text, speechLang, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onWord: (w) => {
        setViseme(visemeFor(w));
        setWordTick((n) => n + 1);
      },
    });
  }

  const mood: Mood = !result ? "neutral" : result.is_correct ? "happy" : result.micro_lesson ? "concerned" : "neutral";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">{t("practice.title")}</h1>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by topic">
          {[{ id: null, name: t("practice.all") }, ...topics].map((tp) => (
            <button
              key={tp.id ?? "all"}
              onClick={() => {
                setTopicId(tp.id);
                loadNext(tp.id);
              }}
              aria-pressed={topicId === tp.id}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                topicId === tp.id ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink-soft hover:text-ink"
              }`}
            >
              {tp.name}
            </button>
          ))}
        </div>
      </div>

      <ErrorNote message={error} />
      {!question ? (
        <Spinner label="Picking your next question" />
      ) : (
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={reason === "retest" ? "marker" : "accent"}>{REASON_TEXT[reason]}</Pill>
            <Pill>{question.topic}</Pill>
            <Pill>{question.subtopic}</Pill>
            <Pill>{DIFFICULTY[question.difficulty]}</Pill>
            {question.source === "ai_generated" && <Pill tone="marker">AI-generated</Pill>}
            <span className="ml-auto text-sm text-ink-soft tabular" aria-label="Time on this question">
              ⏱ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
          <p className="mt-5 whitespace-pre-line text-lg leading-relaxed">{question.body}</p>

          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {question.options.map((option, i) => {
              const isCorrect = result && option === result.correct_option;
              const isWrongPick = result && option === selected && !result.is_correct;
              const picked = !result && option === selected;
              return (
                <li key={option}>
                  <button
                    disabled={!!result || busy}
                    onClick={() => setSelected(option)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      isCorrect
                        ? "border-good bg-good-soft"
                        : isWrongPick
                          ? "border-bad bg-bad-soft"
                          : picked
                            ? "border-accent bg-accent-soft"
                            : "border-line bg-surface hover:border-accent/60"
                    } disabled:cursor-default`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-xs font-medium tabular">
                      {i + 1}
                    </span>
                    <span>{option}</span>
                    {isCorrect && <span className="ml-auto text-good">✓</span>}
                    {isWrongPick && <span className="ml-auto text-bad">✗</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {!result && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => submit(selected)} disabled={!selected || busy}>
                {busy ? "Checking…" : t("practice.submit")}
              </Button>
              <Button variant="ghost" onClick={() => submit(null)} disabled={busy}>
                {t("practice.skip")}
              </Button>
              <span className="ml-auto self-center text-xs text-ink-soft">Keys 1–4 to choose, Enter to check</span>
            </div>
          )}
        </Card>
      )}

      {result && question && (
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex flex-wrap items-center gap-3">
                <p className={`font-display text-2xl font-semibold ${result.is_correct ? "text-good" : "text-bad"}`}>
                  {result.is_correct ? t("practice.correct") : t("practice.incorrect")}
                </p>
                <Pill tone="marker">+{result.xp_gained} XP</Pill>
                {result.misconception_type && <Pill tone="bad">{MISCONCEPTION_LABEL[result.misconception_type].title}</Pill>}
              </div>
              {result.misconception_type && (
                <p className="mt-2 text-sm text-ink-soft">{MISCONCEPTION_LABEL[result.misconception_type].hint}</p>
              )}
              <div className="mt-4">
                <Label>{t("practice.explanation")}</Label>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{result.explanation}</p>
              </div>
            </Card>

            {result.micro_lesson && (
              <Card className="border-marker/40 bg-marker-soft">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("practice.lesson")}</Label>
                  <Button variant="secondary" className="px-3 py-1.5" onClick={() => listen(result.micro_lesson!)}>
                    {speaking ? "■ Stop" : "▶ Listen"}
                  </Button>
                </div>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{result.micro_lesson}</p>
              </Card>
            )}

            <div className="flex flex-wrap gap-2">
              {result.retest_question_id ? (
                <Button variant="marker" onClick={retest} disabled={busy}>
                  {t("practice.retest")} →
                </Button>
              ) : (
                <Button onClick={() => loadNext(topicId)} disabled={busy}>
                  {t("practice.next")} →
                </Button>
              )}
              {result.retest_question_id && (
                <Button variant="secondary" onClick={() => loadNext(topicId)} disabled={busy}>
                  Skip to next
                </Button>
              )}
              <Button variant="secondary" onClick={askTutor}>
                💬 {t("practice.askTutor")}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="flex flex-col items-center">
              <Avatar speaking={speaking} viseme={viseme} wordTick={wordTick} mood={mood} size={170} />
            </Card>
            <Card>
              <Label>Mastery</Label>
              <ul className="mt-2 flex flex-col gap-3">
                {result.mastery.map((m) => (
                  <li key={m.skill}>
                    <div className="flex justify-between text-sm">
                      <span>{m.skill}</span>
                      <span className="font-medium tabular">{Math.round(m.score)}%</span>
                    </div>
                    <ProgressBar value={m.score} />
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span>Daily goal</span>
                  <span className="tabular">
                    {Math.min(result.daily_goal_completed, result.daily_goal_target)} / {result.daily_goal_target}
                  </span>
                </div>
                <ProgressBar value={(100 * result.daily_goal_completed) / result.daily_goal_target} tone="marker" />
              </div>
            </Card>
            {result.new_badges.length > 0 && (
              <Card className="border-marker/40 bg-marker-soft">
                <Label>New badge</Label>
                {result.new_badges.map((b) => (
                  <p key={b.code} className="mt-1 text-sm">
                    🏅 <strong>{b.name}</strong> — {b.description}
                  </p>
                ))}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
