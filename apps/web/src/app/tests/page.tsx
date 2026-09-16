"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { Button, Card, ErrorNote, Label, Pill, ProgressBar } from "@/components/ui";
import { api, Quiz, QuizReport, Topic } from "@/lib/api";
import { useT } from "@/lib/i18n";

type HistoryItem = { id: string; kind: "quiz" | "mock"; score: number; total: number; submitted_at: string };

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
  const { t } = useT();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [count, setCount] = useState(10);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Topic[]>("/topics").then(setTopics).catch(() => {});
    api<HistoryItem[]>("/quizzes").then(setHistory).catch(() => {});
  }, []);

  async function start(kind: "quiz" | "mock") {
    setBusy(true);
    setError(null);
    try {
      const body = kind === "mock" ? { kind, count: 15 } : { kind, count, topic_id: topicId || null };
      onStart(await api<Quiz>("/quizzes", { method: "POST", json: body }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the test.");
      setBusy(false);
    }
  }

  const select = "rounded-lg border border-line bg-surface px-3 py-2 text-sm";

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-semibold">{t("tests.title")}</h1>
      <ErrorNote message={error} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">{t("tests.quiz")}</h2>
            <p className="mt-1 text-sm text-ink-soft">Timed, 1 minute per question. Pick a section or mix all three.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Section
              <select id="quiz-topic" className={select} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">All sections</option>
                {topics.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Questions
              <select id="quiz-count" className={select} value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[5, 10, 15].map((n) => (
                  <option key={n} value={n}>
                    {n} questions · {n} min
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button onClick={() => start("quiz")} disabled={busy} className="self-start">
            {t("tests.start")} →
          </Button>
        </Card>
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">{t("tests.mock")}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              15 questions, 15 minutes, all three sections in order, just like a placement test. You get a section-wise report at the end.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            <Pill>Quantitative ×5</Pill>
            <Pill>Logical ×5</Pill>
            <Pill>Verbal ×5</Pill>
          </ul>
          <Button variant="marker" onClick={() => start("mock")} disabled={busy} className="self-start">
            {t("tests.start")} mock →
          </Button>
        </Card>
      </div>

      <Card>
        <Label>Past results</Label>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Your completed tests will appear here.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <Pill tone={h.kind === "mock" ? "marker" : "accent"}>{h.kind === "mock" ? "Mock" : "Quiz"}</Pill>
                <span className="font-medium tabular">
                  {h.score} / {h.total}
                </span>
                <span className="text-ink-soft">{new Date(h.submitted_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                <button
                  className="ml-auto text-sm font-medium text-accent"
                  onClick={() => api<QuizReport>(`/quizzes/${h.id}/report`).then(onOpenReport).catch((e) => setError(e.message))}
                >
                  View report
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Runner({ quiz, onSubmitted }: { quiz: Quiz; onSubmitted: (r: QuizReport) => void }) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(quiz.duration_seconds);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      setError(e instanceof Error ? e.message : "Couldn't submit. Try again.");
    }
  }, [answers, onSubmitted, quiz, recordTime]);

  useEffect(() => {
    const id = setInterval(() => {
      const left = (endsAt.current - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0) submit();
    }, 500);
    return () => clearInterval(id);
  }, [submit]);

  function go(next: number) {
    recordTime();
    setIndex(next);
  }

  const q = quiz.questions[index];
  const answered = Object.keys(answers).length;
  const low = remaining < 60;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-[57px] z-10 -mx-4 flex items-center gap-3 border-b border-line bg-paper/95 px-4 py-2 backdrop-blur">
        <span className="hidden sm:inline-flex">
          <Pill tone={quiz.kind === "mock" ? "marker" : "accent"}>{quiz.kind === "mock" ? "Mock test" : "Quiz"}</Pill>
        </span>
        <span className="text-sm text-ink-soft tabular">
          {answered}/{quiz.questions.length}
          <span className="hidden sm:inline"> answered</span>
        </span>
        <span className={`ml-auto font-display text-2xl font-semibold tabular ${low ? "text-bad" : ""}`} aria-live={low ? "polite" : "off"}>
          {clock(remaining)}
        </span>
        <Button
          onClick={() => {
            const unanswered = quiz.questions.length - answered;
            if (unanswered === 0 || window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) submit();
          }}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : t("tests.submit")}
        </Button>
      </div>
      <ErrorNote message={error} />

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium tabular">Question {index + 1}</span>
            <Pill>{q.topic}</Pill>
            <Pill>{q.subtopic}</Pill>
          </div>
          <p className="mt-4 whitespace-pre-line text-lg leading-relaxed">{q.body}</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {q.options.map((option, i) => {
              const chosen = answers[q.id] === option;
              return (
                <li key={option}>
                  <button
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: option }))}
                    aria-pressed={chosen}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      chosen ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/60"
                    }`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-xs tabular">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex justify-between gap-2">
            <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
              ← Previous
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
                Clear answer
              </Button>
            )}
            <Button variant="secondary" onClick={() => go(index + 1)} disabled={index === quiz.questions.length - 1}>
              Next →
            </Button>
          </div>
        </Card>
        <Card>
          <Label>Questions</Label>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {quiz.questions.map((item, i) => (
              <button
                key={item.id}
                onClick={() => go(i)}
                aria-label={`Question ${i + 1}${answers[item.id] ? ", answered" : ""}`}
                className={`h-9 rounded-lg border text-sm tabular ${
                  i === index
                    ? "border-accent font-semibold text-accent"
                    : answers[item.id]
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-surface text-ink-soft"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Report({ report, onDone }: { report: QuizReport; onDone: () => void }) {
  const { t } = useT();
  const minutes = report.time_used_ms / 60000;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">{report.kind === "mock" ? "Mock test report" : "Quiz report"}</h1>
        <Button variant="secondary" onClick={onDone}>
          ← Back to tests
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Label>Score</Label>
          <p className="mt-1 font-display text-4xl font-semibold tabular">
            {report.score}
            <span className="text-xl text-ink-soft"> / {report.total}</span>
          </p>
        </Card>
        <Card>
          <Label>Accuracy</Label>
          <p className="mt-1 font-display text-4xl font-semibold tabular">{report.accuracy}%</p>
        </Card>
        <Card>
          <Label>Time used</Label>
          <p className="mt-1 font-display text-4xl font-semibold tabular">{clock(report.time_used_ms / 1000)}</p>
          <p className="text-xs text-ink-soft tabular">
            {report.total ? `${((minutes * 60) / report.total).toFixed(0)}s per question` : ""} of {clock(report.duration_seconds)} allowed
          </p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card>
          <Label>Section-wise</Label>
          <ul className="mt-3 flex flex-col gap-4">
            {report.sections.map((s) => (
              <li key={s.topic}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.topic}</span>
                  <span className="tabular">
                    {s.correct}/{s.total} · {s.total ? Math.round(s.time_ms / s.total / 1000) : 0}s avg
                  </span>
                </div>
                <ProgressBar value={s.total ? (100 * s.correct) / s.total : 0} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <Label>Skills to work on</Label>
          {report.weak_skills.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">No misses. Try a harder mix next time.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {report.weak_skills.map((w) => (
                <li key={w.skill} className="flex justify-between">
                  <span>{w.skill}</span>
                  <Pill tone="bad">missed {w.missed}</Pill>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-ink-soft">These now carry more weight in your adaptive practice.</p>
        </Card>
      </div>

      <Card>
        <Label>{t("tests.review")}</Label>
        <ol className="mt-3 flex flex-col divide-y divide-line">
          {report.questions.map((item, i) => (
            <li key={item.question.id} className="py-4">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                  <span className="text-sm text-ink-soft tabular">{i + 1}.</span>
                  <Pill tone={item.is_correct ? "good" : item.chosen_answer ? "bad" : "neutral"}>
                    {item.is_correct ? "Correct" : item.chosen_answer ? "Wrong" : "Skipped"}
                  </Pill>
                  <span className="min-w-0 flex-1">{item.question.body}</span>
                </summary>
                <div className="mt-3 flex flex-col gap-2 pl-6 text-sm">
                  {!item.is_correct && (
                    <p>
                      Your answer: <span className="text-bad">{item.chosen_answer ?? "—"}</span>
                    </p>
                  )}
                  <p>
                    Correct answer: <span className="font-medium text-good">{item.correct_option}</span>
                  </p>
                  <p className="whitespace-pre-line rounded-lg bg-surface-2 p-3 leading-relaxed">{item.explanation}</p>
                </div>
              </details>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
