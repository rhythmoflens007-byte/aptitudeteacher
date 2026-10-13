"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { FadeIn } from "@/components/motion";
import { Button, Confetti, ErrorNote, Icon, IconTile, PageHeader, Pill, ProgressBar, Ring, Segmented, Skeleton, SpotlightCard } from "@/components/ui";
import { api, Quiz, QuizReport, Topic } from "@/lib/api";
import { useT } from "@/lib/i18n";

type HistoryItem = { id: string; kind: "quiz" | "mock"; score: number; total: number; submitted_at: string };

const SPRING = { type: "spring", stiffness: 300, damping: 26 } as const;
const SECTION_TONES = ["iris", "coral", "lagoon"] as const;
const SECTIONS = ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"];

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function TestsPage() {
  return (
    <AppShell>
      <Tests />
    </AppShell>
  );
}

function Tests() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [report, setReport] = useState<QuizReport | null>(null);

  if (report) return <Report report={report} onDone={() => setReport(null)} />;
  if (quiz)
    return (
      <Runner
        quiz={quiz}
        onSubmitted={(r) => {
          setQuiz(null);
          setReport(r);
        }}
      />
    );
  return <Setup onStart={setQuiz} onOpenReport={setReport} />;
}

function Setup({ onStart, onOpenReport }: { onStart: (q: Quiz) => void; onOpenReport: (r: QuizReport) => void }) {
  const { t, tn, dateLocale, errorText } = useT();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [count, setCount] = useState(10);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Topic[]>("/topics").then(setTopics).catch(() => {});
    api<HistoryItem[]>("/quizzes")
      .then(setHistory)
      .catch((e) => {
        setHistory([]);
        setError(errorText(e));
      });
  }, [errorText]);

  async function start(kind: "quiz" | "mock") {
    setBusy(true);
    setError(null);
    try {
      const body = kind === "mock" ? { kind, count: 15 } : { kind, count, topic_id: topicId || null };
      onStart(await api<Quiz>("/quizzes", { method: "POST", json: body }));
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  async function openReport(id: string) {
    try {
      onOpenReport(await api<QuizReport>(`/quizzes/${id}/report`));
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("tests.eyebrow")} title={t("tests.title")} />
      <ErrorNote message={error} />
      <div className="grid gap-5 md:grid-cols-2">
        <FadeIn>
          <SpotlightCard tint="lagoon" className="flex h-full flex-col gap-6 p-7">
            <div>
              <IconTile name="bolt" tone="lagoon" />
              <h2 className="mt-5 font-display text-3xl">{t("tests.quiz")}</h2>
              <p className="mt-1 text-ink-soft">{t("tests.quizText")}</p>
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("tests.section")}>
              {[{ id: "", name: "" }, ...topics].map((tp) => (
                <button
                  key={tp.id || "all"}
                  role="radio"
                  aria-checked={topicId === tp.id}
                  onClick={() => setTopicId(tp.id)}
                  className={`press rounded-full px-4 py-2 text-sm font-semibold ${topicId === tp.id ? "bg-lagoon text-coal shadow-[0_8px_20px_-8px_rgb(22_194_194/0.7)]" : "bg-surface-2 text-ink-soft hover:text-ink"}`}
                >
                  {tp.id ? tn(tp.name) : t("tests.allSections")}
                </button>
              ))}
            </div>
            <Segmented id="quiz-length" label={t("tests.length")} value={String(count)} options={[5, 10, 15].map((n) => ({ value: String(n), label: t("tests.qs", { n }) }))} onChange={(v) => setCount(Number(v))} />
            <Button variant="secondary" onClick={() => start("quiz")} disabled={busy} className="mt-auto self-start px-6 py-3">
              {t("tests.start")} <Icon name="arrow" className="h-4 w-4" />
            </Button>
          </SpotlightCard>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#5b5bf5] via-[#9b5cf6] to-[#ff6b5c] p-7 text-white shadow-[var(--shadow-lg)]">
            <motion.div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-sun/40 blur-3xl" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 6, repeat: Infinity }} />
            <div className="relative flex h-full flex-col gap-6">
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20">
                    <Icon name="trophy" className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">{t("tests.recommended")}</span>
                </div>
                <h2 className="mt-5 font-display text-3xl">{t("tests.mock")}</h2>
                <p className="mt-1 text-white/85">{t("tests.mockText")}</p>
              </div>
              <ul className="flex flex-col gap-2">
                {SECTIONS.map((name) => (
                  <li key={name} className="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-2.5 text-sm backdrop-blur">
                    {tn(name)}
                    <span className="font-semibold">{t("tests.fiveQs")}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => start("mock")} disabled={busy} className="press shine mt-auto inline-flex items-center gap-2 self-start rounded-full bg-white px-6 py-3 font-semibold text-coal disabled:opacity-50">
                {t("tests.startMock")} <Icon name="arrow" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </FadeIn>
      </div>

      <FadeIn>
        <div className="rounded-[32px] bg-surface p-2 shadow-[var(--shadow-md)]">
          <h2 className="px-5 pb-2 pt-4 font-display text-2xl">{t("tests.past")}</h2>
          {history === null ? (
            <div className="flex flex-col gap-2 p-3" aria-busy aria-label={t("common.loading")}>
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-ink-soft">
              <IconTile name="clipboard" tone="iris" />
              {t("tests.pastEmpty")}
            </div>
          ) : (
            <ul className="flex flex-col">
              {history.map((h) => {
                const pct = h.total ? (100 * h.score) / h.total : 0;
                return (
                  <li key={h.id}>
                    <button onClick={() => openReport(h.id)} className="press flex w-full items-center gap-4 rounded-3xl px-4 py-3 text-left hover:bg-surface-2">
                      <Ring value={Math.max(pct, 3)} size={48} stroke={6} tone={pct >= 60 ? "lagoon" : pct >= 35 ? "sun" : "coral"}>
                        <span className="text-[11px] font-bold tabular">{Math.round(pct)}%</span>
                      </Ring>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {h.kind === "mock" ? t("tests.mockShort") : t("tests.quizShort")} ·{" "}
                          <span className="tabular">
                            {h.score}/{h.total}
                          </span>
                        </p>
                        <p className="text-xs text-ink-soft">{new Date(h.submitted_at).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                      <Icon name="chevron" className="h-4 w-4 text-ink-faint" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </FadeIn>
    </div>
  );
}

function Runner({ quiz, onSubmitted }: { quiz: Quiz; onSubmitted: (r: QuizReport) => void }) {
  const { t, tn, errorText } = useT();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(quiz.duration_seconds);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const spent = useRef<Record<string, number>>({});
  const viewStart = useRef(0);
  const endsAt = useRef(0);
  const submitted = useRef(false);

  useEffect(() => {
    viewStart.current = Date.now();
    endsAt.current = Date.now() + quiz.duration_seconds * 1000;
  }, [quiz.duration_seconds]);

  const recordTime = useCallback(() => {
    const qid = quiz.questions[index].id;
    spent.current[qid] = (spent.current[qid] ?? 0) + (Date.now() - viewStart.current);
    viewStart.current = Date.now();
  }, [index, quiz.questions]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    recordTime();
    setConfirming(false);
    setSubmitting(true);
    try {
      const report = await api<QuizReport>(`/quizzes/${quiz.id}/submit`, {
        method: "POST",
        json: {
          answers: quiz.questions.map((q) => ({
            question_id: q.id,
            chosen_answer: answers[q.id] ?? null,
            time_taken_ms: Math.round(spent.current[q.id] ?? 0),
          })),
        },
      });
      onSubmitted(report);
    } catch (e) {
      submitted.current = false;
      setSubmitting(false);
      setError(errorText(e));
    }
  }, [answers, onSubmitted, quiz, recordTime, errorText]);

  useEffect(() => {
    const id = setInterval(() => {
      const left = (endsAt.current - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0) void submit();
    }, 500);
    return () => clearInterval(id);
  }, [submit]);

  // Leaving mid-test would lose answers: ask the browser to confirm.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!submitted.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function go(next: number) {
    recordTime();
    setIndex(next);
  }

  const q = quiz.questions[index];
  const answered = Object.keys(answers).length;
  const unanswered = quiz.questions.length - answered;
  const low = remaining < 60;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">{quiz.kind === "mock" ? t("tests.mock") : t("tests.quiz")}</h1>
      <div className="glass sticky top-16 z-20 flex items-center gap-4 rounded-full p-2 pr-3 shadow-[var(--shadow-md)] ring-1 ring-hairline lg:top-4">
        <Ring value={(100 * remaining) / quiz.duration_seconds} size={52} stroke={6} tone={low ? "coral" : "iris"}>
          <Icon name="clock" className={`h-4 w-4 ${low ? "text-coral" : "text-iris"}`} />
        </Ring>
        <div className="min-w-0">
          <motion.p
            animate={low ? { scale: [1, 1.08, 1] } : undefined}
            transition={{ duration: 1, repeat: Infinity }}
            className={`font-display text-2xl leading-none tabular ${low ? "text-coral-600" : ""}`}
            role="timer"
            aria-label={t("tests.timeLeft", { time: clock(remaining) })}
          >
            {clock(remaining)}
          </motion.p>
          <p className="text-xs text-ink-soft tabular">{t("tests.answeredOf", { have: answered, total: quiz.questions.length })}</p>
        </div>
        <div className="mx-2 hidden flex-1 sm:block">
          <ProgressBar value={(100 * answered) / quiz.questions.length} tone="spark" label={t("tests.answeredOf", { have: answered, total: quiz.questions.length })} />
        </div>
        <Button variant="spark" className="ml-auto" onClick={() => (unanswered === 0 ? submit() : setConfirming(true))} disabled={submitting}>
          {submitting ? t("tests.submitting") : t("tests.submit")}
        </Button>
      </div>
      <ErrorNote message={error} />

      <div className="grid gap-5 md:grid-cols-[1fr_240px]">
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={SPRING} className="rounded-[32px] bg-surface p-6 shadow-[var(--shadow-md)] sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-spark text-sm font-bold text-white tabular" aria-hidden>
                {index + 1}
              </span>
              <Pill>{tn(q.topic)}</Pill>
              <Pill>{tn(q.subtopic)}</Pill>
            </div>
            <h2 className="mt-5 whitespace-pre-line font-display text-2xl leading-snug sm:text-[28px]">
              <span className="sr-only">{t("tests.questionN", { n: index + 1, total: quiz.questions.length })}: </span>
              {q.body}
            </h2>
            <ul className="mt-7 flex flex-col gap-3">
              {q.options.map((option, i) => {
                const chosen = answers[q.id] === option;
                return (
                  <motion.li key={option} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: i * 0.04 }}>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: option }))}
                      aria-pressed={chosen}
                      className={`flex w-full items-center gap-3 rounded-3xl px-4 py-4 text-left text-[17px] font-medium ring-2 transition-colors duration-300 ${
                        chosen ? "bg-iris-soft ring-iris" : "bg-surface-2 ring-transparent hover:bg-surface hover:ring-line-strong"
                      }`}
                    >
                      <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-sm font-bold ${chosen ? "bg-iris text-white" : "bg-surface text-ink-soft"}`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </motion.button>
                  </motion.li>
                );
              })}
            </ul>
            <div className="mt-7 flex items-center justify-between gap-2">
              <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
                ← {t("tests.previous")}
              </Button>
              {answers[q.id] && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setAnswers((a) => {
                      const next = { ...a };
                      delete next[q.id];
                      return next;
                    })
                  }
                >
                  {t("tests.clear")}
                </Button>
              )}
              <Button variant={index === quiz.questions.length - 1 ? "secondary" : "primary"} onClick={() => go(index + 1)} disabled={index === quiz.questions.length - 1}>
                {t("tests.next")} →
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        <nav className="self-start rounded-[32px] bg-surface p-5 shadow-[var(--shadow-md)] md:sticky md:top-36 lg:top-28" aria-label={t("tests.questions")}>
          <p className="font-semibold">{t("tests.questions")}</p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {quiz.questions.map((item, i) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => go(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={answers[item.id] ? t("tests.gridAnswered", { n: i + 1 }) : t("tests.gridOpen", { n: i + 1 })}
                className={`h-10 rounded-2xl text-sm font-bold tabular transition-colors ${
                  i === index ? "bg-ink text-canvas" : answers[item.id] ? "bg-iris text-white" : "bg-surface-2 text-ink-soft"
                }`}
              >
                {i + 1}
              </motion.button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-1.5 text-xs text-ink-soft">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-md bg-iris" /> {t("tests.legendAnswered")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-md bg-surface-2 ring-1 ring-line-strong" /> {t("tests.legendOpen")}
            </span>
          </div>
        </nav>
      </div>

      <Modal open={confirming} title={t("tests.confirmTitle")} onClose={() => setConfirming(false)}>
        <div className="flex flex-col gap-6">
          <p className="text-lg text-ink-soft">{t("tests.confirmText", { n: unanswered })}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="spark" onClick={submit}>
              {t("tests.submitAnyway")}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t("tests.keepGoing")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Report({ report, onDone }: { report: QuizReport; onDone: () => void }) {
  const { t, tn } = useT();
  const [burst] = useState(() => (report.accuracy >= 60 ? 1 : 0));
  const tone = report.accuracy >= 60 ? "spark" : report.accuracy >= 35 ? "sun" : "coral";
  const verdict = report.accuracy >= 80 ? t("report.outstanding") : report.accuracy >= 60 ? t("report.solid") : report.accuracy >= 35 ? t("report.getting") : t("report.learn");

  return (
    <div className="flex flex-col gap-6">
      <Confetti burst={burst} />
      <PageHeader
        eyebrow={report.kind === "mock" ? t("report.mockTitle") : t("report.quizTitle")}
        title={verdict}
        actions={
          <Button variant="secondary" onClick={onDone}>
            ← {t("report.back")}
          </Button>
        }
      />

      <FadeIn>
        <div className="grid items-center gap-8 rounded-[32px] bg-surface p-7 shadow-[var(--shadow-md)] sm:grid-cols-[auto_1fr]">
          <motion.div initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 14 }} className="mx-auto">
            <Ring value={report.accuracy} size={170} stroke={18} tone={tone}>
              <div>
                <p className="font-display text-5xl tabular">
                  {report.score}
                  <span className="text-xl text-ink-soft">/{report.total}</span>
                </p>
                <p className="text-sm font-semibold text-ink-soft tabular">{report.accuracy}%</p>
              </div>
            </Ring>
          </motion.div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-iris-soft p-5">
              <p className="text-sm font-semibold text-iris">{t("report.timeUsed")}</p>
              <p className="mt-1 font-display text-3xl tabular">{clock(report.time_used_ms / 1000)}</p>
              <p className="text-xs text-ink-soft tabular">{t("report.of", { time: clock(report.duration_seconds) })}</p>
            </div>
            <div className="rounded-3xl bg-lagoon-soft p-5">
              <p className="text-sm font-semibold text-lagoon-600">{t("report.perQuestion")}</p>
              <p className="mt-1 font-display text-3xl tabular">{report.total ? Math.round(report.time_used_ms / report.total / 1000) : 0}s</p>
              <p className="text-xs text-ink-soft">{t("report.onAverage")}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <FadeIn>
          <div className="h-full rounded-[32px] bg-surface p-7 shadow-[var(--shadow-md)]">
            <h2 className="font-display text-2xl">{t("report.bySection")}</h2>
            <ul className="mt-5 flex flex-col gap-5">
              {report.sections.map((s, i) => (
                <li key={s.topic}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold">{tn(s.topic)}</span>
                    <span className="tabular text-ink-soft">
                      <span className="font-bold text-ink">
                        {s.correct}/{s.total}
                      </span>{" "}
                      · {t("report.avg", { s: s.total ? Math.round(s.time_ms / s.total / 1000) : 0 })}
                    </span>
                  </div>
                  <ProgressBar value={s.total ? (100 * s.correct) / s.total : 0} tone={SECTION_TONES[i % 3]} thick />
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
        <FadeIn delay={0.08}>
          <div className="h-full rounded-[32px] bg-surface p-7 shadow-[var(--shadow-md)]">
            <h2 className="font-display text-2xl">{t("report.workOn")}</h2>
            {report.weak_skills.length === 0 ? (
              <p className="mt-3 text-ink-soft">{t("report.noMisses")}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {report.weak_skills.map((w, i) => (
                  <motion.li key={w.skill} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: i * 0.06 }} className="flex items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm">
                    <span className="truncate">{tn(w.skill)}</span>
                    <span className="shrink-0 whitespace-nowrap">
                      <Pill tone="coral">{t("report.missed", { n: w.missed })}</Pill>
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
            {report.weak_skills.length > 0 && <p className="mt-4 text-xs text-ink-soft">{t("report.extraAttention")}</p>}
          </div>
        </FadeIn>
      </div>

      <FadeIn>
        <div className="rounded-[32px] bg-surface p-2 shadow-[var(--shadow-md)]">
          <h2 className="px-5 pb-2 pt-4 font-display text-2xl">{t("tests.review")}</h2>
          <ol className="flex flex-col gap-1 p-2">
            {report.questions.map((item, i) => (
              <li key={item.question.id}>
                <details className="group rounded-3xl transition-colors open:bg-surface-2">
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-3xl p-3 hover:bg-surface-2">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        item.is_correct ? "bg-success-soft text-success" : item.chosen_answer ? "bg-danger-soft text-danger" : "bg-surface-2 text-ink-soft"
                      }`}
                    >
                      {item.is_correct ? <Icon name="check" className="h-4 w-4" /> : item.chosen_answer ? <Icon name="x" className="h-4 w-4" /> : i + 1}
                      <span className="sr-only">{item.is_correct ? t("dash.correct") : item.chosen_answer ? t("dash.wrong") : t("report.skipped")}</span>
                    </span>
                    <span className="min-w-0 flex-1 text-sm">{item.question.body}</span>
                    <Icon name="chevron" className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-300 group-open:rotate-90" />
                  </summary>
                  <div className="flex flex-col gap-2 px-3 pb-4 pl-14 text-sm">
                    {!item.is_correct && (
                      <p>
                        {t("report.yourAnswer")} <span className="font-semibold text-danger">{item.chosen_answer ?? t("report.skipped")}</span>
                      </p>
                    )}
                    <p>
                      {t("report.correctAnswer")} <span className="font-semibold text-success">{item.correct_option}</span>
                    </p>
                    <p className="whitespace-pre-line rounded-2xl bg-surface p-4 leading-relaxed">{item.explanation}</p>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </div>
      </FadeIn>
    </div>
  );
}
