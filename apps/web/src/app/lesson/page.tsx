"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import QuestsCard from "@/components/QuestsCard";
import TutorAvatar from "@/components/TutorAvatar";
import { Button, buttonClass, Confetti, ErrorState, Icon, Skeleton } from "@/components/ui";
import { api, AttemptResult, optionLabel, Question } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LessonStart, LessonSummary, patchGame, refreshGame, timeUntil } from "@/lib/game";
import { useT } from "@/lib/i18n";
import { play, setSounds, soundsOn } from "@/lib/sfx";
import { useTutor } from "@/lib/tutor";

const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;

type Feedback = { correct: boolean; result: AttemptResult; question: Question };

export default function LessonPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  if (loading || !user) return <LessonSkeleton />;
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <KeyedPlayer />
    </Suspense>
  );
}

/** A new lesson key (e.g. "next lesson") starts a fresh player. */
function KeyedPlayer() {
  const key = useSearchParams().get("key");
  return <LessonPlayer key={key} lessonKey={key} />;
}

function LessonSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8" aria-busy>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-32" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

function LessonPlayer({ lessonKey }: { lessonKey: string | null }) {
  const { t, tn, errorText } = useT();
  const tutor = useTutor();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  const [solved, setSolved] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [sound, setSound] = useState(soundsOn);
  const [combo, setCombo] = useState(0);
  const shownAt = useRef(0);

  useEffect(() => {
    if (!lessonKey) {
      router.replace("/learn");
      return;
    }
    api<LessonStart>("/learn/lessons/start", { method: "POST", json: { key: lessonKey } })
      .then((data) => {
        setLesson(data);
        setQueue(data.questions);
        setHearts(data.hearts);
        shownAt.current = Date.now();
      })
      .catch((e) => setError(errorText(e)));
  }, [router, errorText, lessonKey]);

  const finish = useCallback(async () => {
    if (!lesson) return;
    try {
      const done = await api<LessonSummary>(`/learn/runs/${lesson.run_id}/finish`, { method: "POST" });
      setSummary(done);
      if (done.completed) play("complete");
      void refreshGame();
    } catch (e) {
      setError(errorText(e));
    }
  }, [lesson, errorText]);

  const check = useCallback(async () => {
    const question = queue[0];
    if (!lesson || !question || !selected || busy || feedback) return;
    setBusy(true);
    try {
      const result = await api<AttemptResult>("/attempts", {
        method: "POST",
        json: { question_id: question.id, chosen_answer: selected, time_taken_ms: Date.now() - shownAt.current, lesson_run_id: lesson.run_id },
      });
      setFeedback({ correct: result.is_correct, result, question });
      play(result.is_correct ? "correct" : "wrong");
      setCombo((c) => (result.is_correct ? c + 1 : 0));
      if (typeof result.hearts === "number") {
        setHearts(result.hearts);
        patchGame({ hearts: result.hearts });
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }, [queue, lesson, selected, busy, feedback, errorText]);

  const next = useCallback(() => {
    if (!feedback) return;
    const [current, ...rest] = queue;
    // A missed question comes back at the end, until it is answered right.
    const remaining = feedback.correct ? rest : [...rest, current];
    if (feedback.correct) setSolved((n) => n + 1);
    setFeedback(null);
    setSelected(null);
    setQueue(remaining);
    shownAt.current = Date.now();
    if (!feedback.correct && hearts <= 0) setOutOfHearts(true);
    else if (remaining.length === 0) void finish();
  }, [feedback, queue, hearts, finish]);

  // Keyboard: 1–4 choose, Enter checks or continues.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (summary || quitOpen || outOfHearts || (e.target as HTMLElement)?.tagName === "INPUT") return;
      const question = queue[0];
      if (!question) return;
      const n = Number(e.key);
      if (!feedback && n >= 1 && n <= question.options.length) setSelected(question.options[n - 1]);
      if (e.key === "Enter") {
        e.preventDefault();
        if (feedback) next();
        else void check();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue, feedback, summary, quitOpen, outOfHearts, check, next]);

  async function quit() {
    setQuitOpen(false);
    if (lesson && !summary) await api(`/learn/runs/${lesson.run_id}/finish`, { method: "POST" }).catch(() => {});
    void refreshGame();
    router.push("/learn");
  }

  if (error && !lesson) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <ErrorState message={error} onRetry={() => location.reload()} />
        <div className="mt-6 text-center">
          <Link href="/learn" className={buttonClass("secondary")}>
            ← {t("lesson.backToPath")}
          </Link>
        </div>
      </div>
    );
  }
  if (!lesson) return <LessonSkeleton />;
  if (summary) return <Summary summary={summary} onContinue={() => router.push(summary.next_key ? `/lesson?key=${encodeURIComponent(summary.next_key)}` : "/learn")} onRetry={() => location.reload()} />;

  const total = lesson.questions.length;
  const question = queue[0];
  const title = lesson.lesson.kind === "checkpoint" ? t("learn.checkpoint") : tn(lesson.lesson.skill ?? "");

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-44 pt-4 sm:px-6">
      {/* Top bar: quit, progress, hearts */}
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-3 bg-canvas/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button onClick={() => setQuitOpen(true)} aria-label={t("lesson.quit")} className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink">
          <Icon name="x" className="h-5 w-5" />
        </button>
        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={t("lesson.progress")} aria-valuenow={solved} aria-valuemin={0} aria-valuemax={total}>
          <motion.div className="h-full rounded-full bg-gradient-to-r from-lagoon to-success" animate={{ width: `${(100 * solved) / total}%` }} transition={SPRING} />
          <div className="absolute inset-x-3 top-1 h-1 rounded-full bg-white/30" aria-hidden />
        </div>
        <button
          onClick={() => {
            setSounds(!sound);
            setSound(!sound);
          }}
          aria-label={sound ? t("lesson.soundOff") : t("lesson.soundOn")}
          aria-pressed={sound}
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
        >
          <Icon name={sound ? "speaker" : "x"} className="h-4 w-4" />
        </button>
        <motion.span key={hearts} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="flex shrink-0 items-center gap-1 font-bold tabular text-coral" aria-label={t("game.heartsFull", { n: hearts })}>
          <Icon name="heart" className={`h-6 w-6 ${hearts > 0 ? "fill-coral" : ""}`} /> {hearts}
        </motion.span>
      </header>

      <p className="mt-6 text-sm font-semibold text-ink-soft">
        {title}
        {lesson.lesson.kind === "skill" && <span> · {t(`learn.level${lesson.lesson.level ?? 1}` as "learn.level1")}</span>}
      </p>

      <AnimatePresence mode="wait">
        {question && (
          <motion.section key={question.id + queue.length} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={SPRING} className="mt-3 flex flex-col gap-6" aria-live="polite">
            <div className="flex items-start gap-3">
              <TutorAvatar gender={tutor.gender} mood={feedback ? (feedback.correct ? "happy" : "thinking") : "neutral"} stage={false} className="hidden h-28 w-24 shrink-0 sm:block" />
              <div className="relative flex-1 rounded-3xl bg-surface p-5 shadow-[var(--shadow-md)] ring-1 ring-hairline sm:p-6">
                <h1 className="whitespace-pre-line font-display text-xl leading-snug sm:text-2xl">{question.body}</h1>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("lesson.choose")}>
              {question.options.map((option, i) => {
                const picked = selected === option;
                const isRight = !!feedback && option === feedback.result.correct_option;
                const isWrong = !!feedback && picked && !feedback.correct;
                return (
                  <li key={option}>
                    <motion.button
                      role="radio"
                      aria-checked={picked}
                      disabled={!!feedback || busy}
                      onClick={() => setSelected(option)}
                      whileTap={!feedback ? { scale: 0.97 } : undefined}
                      animate={isWrong ? { x: [0, -8, 8, -5, 5, 0] } : isRight ? { scale: [1, 1.03, 1] } : undefined}
                      className={`flex w-full items-center gap-3 rounded-3xl border-2 border-b-4 px-4 py-4 text-left text-[17px] font-medium transition-colors ${
                        isRight
                          ? "border-success bg-success-soft"
                          : isWrong
                            ? "border-danger bg-danger-soft"
                            : picked
                              ? "border-iris bg-iris-soft"
                              : "border-line bg-surface hover:bg-surface-2"
                      }`}
                    >
                      <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border-2 text-sm font-bold ${picked ? "border-iris text-iris-600" : "border-line text-ink-soft"}`}>
                        {i + 1}
                      </span>
                      {optionLabel(question, option)}
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Bottom bar: check, then feedback */}
      <div className={`pb-safe fixed inset-x-0 bottom-0 z-30 border-t-2 transition-colors duration-300 ${feedback ? (feedback.correct ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft") : "border-hairline bg-canvas/95 backdrop-blur"}`}>
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          {feedback ? (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="min-w-0 flex-1" role="status">
              <p className={`flex items-center gap-2 font-display text-xl ${feedback.correct ? "text-success" : "text-danger"}`}>
                <Icon name={feedback.correct ? "check" : "x"} className="h-6 w-6" />
                {feedback.correct ? (combo >= 3 ? t("lesson.combo", { n: combo }) : t("lesson.correct")) : t("lesson.wrong")}
              </p>
              {!feedback.correct && (
                <p className="mt-1 text-sm">
                  {t("lesson.answerWas")} <strong>{optionLabel(feedback.question, feedback.result.correct_option)}</strong>
                </p>
              )}
              <details className="mt-1 text-sm">
                <summary className="cursor-pointer font-semibold text-ink-soft">{t("lesson.why")}</summary>
                <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line rounded-2xl bg-surface p-3 leading-relaxed">{feedback.result.explanation}</p>
              </details>
            </motion.div>
          ) : (
            <p className="hidden flex-1 text-sm text-ink-soft sm:block">{t("lesson.keys")}</p>
          )}
          {feedback ? (
            <Button variant={feedback.correct ? "primary" : "marker"} onClick={next} className="w-full px-10 py-3.5 text-base sm:w-auto" autoFocus>
              {t("lesson.continue")}
            </Button>
          ) : (
            <Button variant="spark" onClick={() => void check()} disabled={!selected || busy} className="w-full px-10 py-3.5 text-base sm:w-auto">
              {busy ? t("common.checking") : t("lesson.check")}
            </Button>
          )}
        </div>
      </div>

      <Modal open={quitOpen} title={t("lesson.quitTitle")} onClose={() => setQuitOpen(false)}>
        <p className="text-ink-soft">{t("lesson.quitNote")}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <Button variant="primary" onClick={() => setQuitOpen(false)} className="sm:flex-1">
            {t("lesson.keepGoing")}
          </Button>
          <Button variant="ghost" onClick={() => void quit()} className="sm:flex-1">
            {t("lesson.quitConfirm")}
          </Button>
        </div>
      </Modal>

      <Modal open={outOfHearts} title={t("lesson.noHeartsTitle")} onClose={() => void quit()}>
        <OutOfHearts onQuit={() => void quit()} />
      </Modal>
    </div>
  );
}

function OutOfHearts({ onQuit }: { onQuit: () => void }) {
  const { t } = useT();
  const [refill, setRefill] = useState<ReturnType<typeof timeUntil>>(null);
  useEffect(() => {
    api<{ next_heart_at: string | null }>("/game/status")
      .then((s) => setRefill(timeUntil(s.next_heart_at)))
      .catch(() => {});
  }, []);
  return (
    <div>
      <div className="flex justify-center gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Icon key={i} name="heart" className="h-8 w-8 text-coral/30" />
        ))}
      </div>
      <p className="mt-4 text-center text-ink-soft">{t("lesson.noHeartsNote")}</p>
      {refill && <p className="mt-1 text-center text-sm font-semibold tabular">{t("lesson.refillIn", { h: refill.h, m: refill.m })}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <Link href="/practice" className={buttonClass("spark", "justify-center py-3")}>
          <Icon name="heart" className="h-4 w-4" /> {t("lesson.earnHearts")}
        </Link>
        <Button variant="ghost" onClick={onQuit}>
          {t("lesson.endLesson")}
        </Button>
      </div>
    </div>
  );
}

function Summary({ summary, onContinue, onRetry }: { summary: LessonSummary; onContinue: () => void; onRetry: () => void }) {
  const { t, tn } = useT();
  const tutor = useTutor();
  const seconds = Math.round(summary.time_ms / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  if (!summary.completed) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
        <TutorAvatar gender={tutor.gender} mood="thinking" stage={false} className="h-40 w-36" />
        <h1 className="font-display text-3xl">{t("lesson.notFinished")}</h1>
        <p className="text-ink-soft">{t("lesson.notFinishedNote")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/learn" className={buttonClass("secondary")}>
            {t("lesson.backToPath")}
          </Link>
          <Link href="/practice" className={buttonClass("spark")}>
            <Icon name="heart" className="h-4 w-4" /> {t("lesson.earnHearts")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center gap-7 px-4 py-12 text-center">
      <Confetti burst={1} />
      <div className="flex items-end gap-2" aria-label={t("learn.doneStars", { n: summary.stars })} role="img">
        {[1, 2, 3].map((s) => (
          <motion.span key={s} initial={{ scale: 0, rotate: -40 }} animate={{ scale: s <= summary.stars ? 1 : 0.8, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.25 * s }} className={s === 2 ? "-translate-y-3" : ""}>
            <Icon name="star" className={`h-16 w-16 ${s <= summary.stars ? "fill-sun text-sun drop-shadow" : "text-line-strong"}`} />
          </motion.span>
        ))}
      </div>
      <div>
        <h1 className="font-display text-4xl sm:text-5xl">{t("lesson.complete")}</h1>
        <p className="mt-2 text-ink-soft">{summary.stars === 3 ? t("lesson.perfect") : t("lesson.wellDone", { name: tutor.name })}</p>
      </div>
      <div className="grid w-full grid-cols-3 gap-3">
        {[
          { label: t("lesson.totalXp"), value: `+${summary.xp}`, tone: "bg-sun-soft text-sun-600", icon: "bolt" },
          { label: t("lesson.accuracy"), value: `${summary.accuracy}%`, tone: "bg-success-soft text-success", icon: "target" },
          { label: t("lesson.time"), value: clock, tone: "bg-lagoon-soft text-lagoon-600", icon: "clock" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...SPRING, delay: 0.6 + i * 0.1 }} className={`rounded-3xl p-4 ${s.tone}`}>
            <Icon name={s.icon} className="mx-auto h-5 w-5" />
            <p className="mt-2 font-display text-2xl tabular text-ink">{s.value}</p>
            <p className="text-xs font-semibold">{s.label}</p>
          </motion.div>
        ))}
      </div>
      {summary.new_badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {summary.new_badges.map((b) => (
            <span key={b.code} className="flex items-center gap-2 rounded-full bg-iris-soft px-4 py-2 text-sm font-semibold text-iris-600">
              <Icon name="trophy" className="h-4 w-4" /> {tn(`badge.${b.code}.name`, b.name)}
            </span>
          ))}
        </div>
      )}
      <div className="w-full text-left">
        <QuestsCard initial={summary.quests} />
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button variant="secondary" onClick={onRetry} className="py-3.5 sm:flex-1">
          <Icon name="refresh" className="h-4 w-4" /> {t("lesson.again")}
        </Button>
        <Button variant="spark" onClick={onContinue} className="py-3.5 text-base sm:flex-1" autoFocus>
          {summary.next_key ? t("lesson.nextLesson") : t("lesson.backToPath")} <Icon name="arrow" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
