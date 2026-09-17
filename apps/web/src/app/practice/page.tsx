"use client";

import { useRouter } from "next/navigation";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import type { Mood } from "@/components/Avatar";
import TutorAvatar from "@/components/TutorAvatar";
import { Button, Card, Confetti, DIFFICULTY, ErrorNote, Icon, Label, MISCONCEPTION_LABEL, Pill, ProgressBar, Skeleton } from "@/components/ui";
import { api, AttemptResult, Question, Topic, TutorSession } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useMedia } from "@/lib/useMedia";
import { useTutor } from "@/lib/tutor";
import { useTutorVoice } from "@/lib/useTutorVoice";

type Reason = "retest" | "weakest_skill" | "new_skill";

const REASON: Record<Reason, { text: string; icon: string; tone: "marker" | "accent" | "violet" }> = {
  retest: { text: "Re-test: checking that idea again", icon: "refresh", tone: "marker" },
  weakest_skill: { text: "Focus: one of your weakest skills", icon: "target", tone: "accent" },
  new_skill: { text: "New skill to explore", icon: "sparkles", tone: "violet" },
};

export default function PracticePage() {
  return (
    <AppShell wide>
      <Practice />
    </AppShell>
  );
}

function Practice() {
  const { t } = useT();
  const tutor = useTutor();
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
  const [confetti, setConfetti] = useState(0);
  const [qKey, setQKey] = useState(0);
  const startedAt = useRef(0);

  const voice = useTutorVoice();
  const { stop: stopVoice } = voice;
  const wide = useMedia("(min-width: 1024px)");

  const show = useCallback((q: Question, r: Reason) => {
    stopVoice();
    setQuestion(q);
    setReason(r);
    setSelected(null);
    setResult(null);
    setError(null);
    setQKey((k) => k + 1);
    startedAt.current = Date.now();
    setElapsed(0);
  }, [stopVoice]);

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
        if (res.is_correct || res.new_badges.length) setConfetti((n) => n + 1);
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

  function toggleListen(text: string, key: string) {
    if (voice.activeKey === key) voice.stop();
    else voice.say(text, key);
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

  const mood: Mood = busy && !result ? "thinking" : !result ? (selected ? "listening" : "neutral") : result.is_correct ? "happy" : "concerned";
  const reasonInfo = REASON[reason];
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-5">
      <Confetti burst={confetti} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>{tutor.name} picks each question for you</Label>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t("practice.title")}</h1>
        </div>
        <div className="no-scrollbar -mx-4 flex max-w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by topic">
          {[{ id: null, name: t("practice.all") }, ...topics].map((tp) => (
            <button
              key={tp.id ?? "all"}
              onClick={() => {
                setTopicId(tp.id);
                loadNext(tp.id);
              }}
              aria-pressed={topicId === tp.id}
              className={`press shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
                topicId === tp.id ? "border-transparent bg-brand text-accent-ink shadow-[var(--shadow-glow)]" : "border-line bg-surface text-ink-soft hover:border-accent/50 hover:text-ink"
              }`}
            >
              {tp.name}
            </button>
          ))}
        </div>
      </div>

      <ErrorNote message={error} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {!question ? (
            <Card className="flex flex-col gap-4 p-6">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-16" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            </Card>
          ) : (
            <Card key={qKey} className="rise p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={reasonInfo.tone}>
                  <Icon name={reasonInfo.icon} className="h-3.5 w-3.5" />
                  {reasonInfo.text}
                </Pill>
                <Pill>{question.subtopic}</Pill>
                <Pill>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < question.difficulty ? "bg-marker" : "bg-line"}`} />
                  ))}
                  <span className="ml-1">{DIFFICULTY[question.difficulty]}</span>
                </Pill>
                {question.source === "ai_generated" && <Pill tone="violet">AI-generated</Pill>}
                <span
                  className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm tabular ${result ? "text-ink-soft" : elapsed > 90 ? "bg-marker-soft text-marker" : "bg-surface-2 text-ink-soft"}`}
                  aria-label="Time on this question"
                >
                  <Icon name="clock" className="h-4 w-4" /> {minutes}:{seconds}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-soft">{question.topic}</p>
              <p className="mt-3 whitespace-pre-line text-lg leading-relaxed sm:text-xl">{question.body}</p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {question.options.map((option, i) => {
                  const isCorrect = result && option === result.correct_option;
                  const isWrongPick = result && option === selected && !result.is_correct;
                  const picked = !result && option === selected;
                  const dim = result && !isCorrect && !isWrongPick;
                  return (
                    <li key={option} className="rise" style={{ "--i": i + 1 } as CSSProperties}>
                      <button
                        disabled={!!result || busy}
                        onClick={() => setSelected(option)}
                        aria-pressed={picked}
                        className={`press group flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition disabled:cursor-default ${
                          isCorrect
                            ? "pulse-good border-good bg-good-soft"
                            : isWrongPick
                              ? "shake border-bad bg-bad-soft"
                              : picked
                                ? "-translate-y-0.5 border-accent bg-accent-soft shadow-[var(--shadow-glow)]"
                                : "border-line bg-surface hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[var(--shadow-md)]"
                        } ${dim ? "opacity-55" : ""}`}
                      >
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-semibold tabular transition ${
                            isCorrect ? "bg-good text-white" : isWrongPick ? "bg-bad text-white" : picked ? "bg-brand text-accent-ink" : "bg-surface-2 text-ink-soft group-hover:text-ink"
                          }`}
                        >
                          {isCorrect ? <Icon name="check" className="pop h-4 w-4" /> : isWrongPick ? <Icon name="x" className="pop h-4 w-4" /> : i + 1}
                        </span>
                        <span className="text-base">{option}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {!result && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <Button onClick={() => submit(selected)} disabled={!selected || busy} className="px-6 py-3">
                    {busy ? "Checking…" : t("practice.submit")}
                    {!busy && <Icon name="arrow" className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" onClick={() => submit(null)} disabled={busy}>
                    {t("practice.skip")}
                  </Button>
                  <span className="ml-auto hidden text-xs text-ink-soft sm:inline">
                    <kbd className="rounded border border-line bg-surface-2 px-1.5">1</kbd>–<kbd className="rounded border border-line bg-surface-2 px-1.5">4</kbd> choose ·{" "}
                    <kbd className="rounded border border-line bg-surface-2 px-1.5">Enter</kbd> check
                  </span>
                </div>
              )}
            </Card>
          )}

          {result && question && (
            <>
              <Card className={`rise relative overflow-hidden border-2 ${result.is_correct ? "border-good/40" : "border-bad/30"}`}>
                <span aria-hidden className={`absolute -right-12 -top-12 h-40 w-40 rounded-full ${result.is_correct ? "bg-good/10" : "bg-bad/10"}`} />
                <div className="relative flex flex-wrap items-center gap-3">
                  <span className={`pop grid h-12 w-12 place-items-center rounded-2xl text-white ${result.is_correct ? "bg-brand" : "bg-[linear-gradient(135deg,var(--bad),#e46a6a)]"}`}>
                    <Icon name={result.is_correct ? "check" : "x"} className="h-6 w-6" />
                  </span>
                  <p className={`font-display text-3xl font-semibold ${result.is_correct ? "text-good" : "text-bad"}`}>
                    {result.is_correct ? t("practice.correct") : t("practice.incorrect")}
                  </p>
                  <span className="relative">
                    <Pill tone="marker">
                      <Icon name="bolt" className="h-3.5 w-3.5" />+{result.xp_gained} XP
                    </Pill>
                    <span aria-hidden className="xp-float absolute -top-6 left-2 font-display text-lg font-semibold text-marker">
                      +{result.xp_gained}
                    </span>
                  </span>
                  {result.misconception_type && <Pill tone="bad">{MISCONCEPTION_LABEL[result.misconception_type].title}</Pill>}
                </div>
                {result.misconception_type && <p className="relative mt-2 text-sm text-ink-soft">{MISCONCEPTION_LABEL[result.misconception_type].hint}</p>}
                <div className="relative mt-5 rounded-2xl bg-surface-2/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t("practice.explanation")}</Label>
                    <ListenButton active={voice.activeKey === "explanation"} onToggle={() => toggleListen(result.explanation, "explanation")} />
                  </div>
                  <p className="mt-2 whitespace-pre-line leading-relaxed" dir="auto">
                    {result.explanation}
                  </p>
                </div>
              </Card>

              {result.micro_lesson && (
                <Card className="rise border-marker/40 bg-marker-soft/70" style={{ "--i": 1 } as CSSProperties}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-sunrise text-white">
                        <Icon name="book" className="h-4 w-4" />
                      </span>
                      <Label>
                        {t("practice.lesson")} · {tutor.name}
                      </Label>
                    </div>
                    <ListenButton active={voice.activeKey === "lesson"} onToggle={() => toggleListen(result.micro_lesson!, "lesson")} />
                  </div>
                  <p className="mt-3 whitespace-pre-line leading-relaxed" dir="auto">
                    {result.micro_lesson}
                  </p>
                </Card>
              )}

              <div className="rise flex flex-wrap gap-2" style={{ "--i": 2 } as CSSProperties}>
                {result.retest_question_id ? (
                  <>
                    <Button variant="marker" onClick={retest} disabled={busy} className="px-5 py-3">
                      <Icon name="refresh" className="h-4 w-4" />
                      {t("practice.retest")}
                    </Button>
                    <Button variant="secondary" onClick={() => loadNext(topicId)} disabled={busy}>
                      Skip to next
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => loadNext(topicId)} disabled={busy} className="px-5 py-3">
                    {t("practice.next")} <Icon name="arrow" className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="secondary" onClick={askTutor}>
                  <Icon name="chat" className="h-4 w-4" />
                  {t("practice.askTutor")}
                </Button>
              </div>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="flex items-center gap-4 p-4 lg:flex-col lg:p-5">
            <TutorAvatar
              gender={tutor.gender}
              speaking={voice.speaking}
              viseme={voice.viseme}
              wordTick={voice.wordTick}
              gestureTick={voice.gestureTick}
              mood={voice.speaking ? "neutral" : mood}
              framing={wide ? "full" : "portrait"}
              className="aspect-square w-28 shrink-0 sm:w-36 lg:aspect-[4/5] lg:w-full"
            />
            <div className="min-w-0 lg:text-center">
              <p className="font-display text-xl font-semibold">{tutor.name}</p>
              <p className="text-sm text-ink-soft" aria-live="polite">
                {!result
                  ? busy
                    ? "Choosing your next question…"
                    : selected
                      ? "Happy with that? Check your answer."
                      : "Take your time and set the problem up first."
                  : voice.speaking
                    ? "Explaining it step by step…"
                    : result.is_correct
                    ? "Nicely done! That skill just got stronger."
                    : result.micro_lesson
                      ? "Let's fix this idea together. Read the quick lesson."
                      : "Close one. Re-check the calculation next time."}
              </p>
            </div>
          </Card>

          {result && (
            <Card className="rise">
              <Label>Mastery</Label>
              <ul className="mt-3 flex flex-col gap-3">
                {result.mastery.map((m) => (
                  <li key={m.skill}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="truncate">{m.skill}</span>
                      <span className="font-semibold tabular">{Math.round(m.score)}%</span>
                    </div>
                    <ProgressBar value={m.score} />
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <div className="mb-1 flex justify-between text-sm">
                  <span>Daily goal</span>
                  <span className="tabular">
                    {Math.min(result.daily_goal_completed, result.daily_goal_target)} / {result.daily_goal_target}
                  </span>
                </div>
                <ProgressBar value={(100 * result.daily_goal_completed) / result.daily_goal_target} tone="marker" />
              </div>
            </Card>
          )}

          {result && result.new_badges.length > 0 && (
            <Card className="pop shine border-marker/40 bg-marker-soft">
              <Label>New badge unlocked</Label>
              {result.new_badges.map((b) => (
                <div key={b.code} className="mt-3 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sunrise text-white shadow-[var(--shadow-md)]">
                    <Icon name="trophy" />
                  </span>
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-ink-soft">{b.description}</p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function ListenButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Button variant="secondary" className="shrink-0 px-3 py-1.5" onClick={onToggle}>
      <Icon name={active ? "stop" : "speaker"} className="h-4 w-4" />
      {active ? "Stop" : "Listen"}
    </Button>
  );
}
