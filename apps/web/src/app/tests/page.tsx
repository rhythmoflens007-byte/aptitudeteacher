"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { Button, Card, Confetti, ErrorNote, Icon, IconTile, Label, PageHeader, Pill, ProgressBar, Ring, Segmented } from "@/components/ui";
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Timed practice under exam conditions" title={t("tests.title")} />
      <ErrorNote message={error} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rise flex flex-col gap-5 p-0">
          <div className="px-6 pt-6">
            <IconTile name="bolt" tone="accent" />
            <h2 className="mt-4 font-display text-2xl">{t("tests.quiz")}</h2>
            <p className="mt-1 text-sm text-ink-soft">Timed, one minute per question. Pick a section or mix all three.</p>
          </div>
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div>
              <p className="mb-2 text-sm font-medium">Section</p>
              <div className="flex flex-wrap gap-2">
                {[{ id: "", name: "All sections" }, ...topics].map((tp) => (
                  <button
                    key={tp.id || "all"}
                    onClick={() => setTopicId(tp.id)}
                    aria-pressed={topicId === tp.id}
                    className={`press rounded-md border px-3 py-1.5 text-sm ${topicId === tp.id ? "border-ink bg-primary font-medium text-primary-ink" : "border-line text-ink-soft hover:border-line-strong hover:text-ink"}`}
                  >
                    {tp.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Length</p>
              <Segmented
                id="quiz-length"
                label="Quiz length"
                value={String(count)}
                options={[5, 10, 15].map((n) => ({ value: String(n), label: `${n} Qs · ${n}m` }))}
                onChange={(v) => setCount(Number(v))}
              />
            </div>
            <Button variant="secondary" onClick={() => start("quiz")} disabled={busy} className="self-start px-6 py-3">
              {t("tests.start")} <Icon name="arrow" className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Card className="rise relative flex flex-col gap-5 p-0" style={{ "--i": 1 } as CSSProperties}>
          <span className="absolute right-5 top-5">
            <Pill tone="accent">Recommended</Pill>
          </span>
          <div className="px-6 pt-6">
            <IconTile name="trophy" tone="marker" />
            <h2 className="mt-4 font-display text-2xl">{t("tests.mock")}</h2>
            <p className="mt-1 text-sm text-ink-soft">15 questions in 15 minutes across all sections, like a real placement test.</p>
          </div>
          <div className="flex flex-1 flex-col gap-4 px-6 pb-6">
            <ul className="divide-y divide-line rounded-lg border border-line">
              {[
                ["brain", "Quantitative Aptitude", "5 questions"],
                ["chart", "Logical Reasoning", "5 questions"],
                ["book", "Verbal Ability", "5 questions"],
              ].map(([icon, name, n]) => (
                <li key={name} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <Icon name={icon} className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">{name}</span>
                  <span className="text-ink-soft tabular">{n}</span>
                </li>
              ))}
            </ul>
            <Button onClick={() => start("mock")} disabled={busy} className="mt-auto self-start px-6 py-3">
              {t("tests.start")} mock <Icon name="arrow" className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      <Card className="rise" style={{ "--i": 2 } as CSSProperties}>
        <Label>Past results</Label>
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-ink-soft">
            <Icon name="clipboard" className="h-8 w-8 text-accent" />
            Your completed tests will appear here.
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {history.map((h) => {
              const pct = h.total ? (100 * h.score) / h.total : 0;
              return (
                <li key={h.id}>
                  <button
                    onClick={() => api<QuizReport>(`/quizzes/${h.id}/report`).then(onOpenReport).catch((e) => setError(e.message))}
                    className="press flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm hover:border-line-strong hover:bg-surface-2/60"
                  >
                    <Ring value={Math.max(pct, 2)} size={44} stroke={5} tone={pct >= 60 ? "accent" : pct >= 35 ? "marker" : "bad"}>
                      <span className="text-[10px] font-semibold tabular">{Math.round(pct)}%</span>
                    </Ring>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {h.kind === "mock" ? "Mock test" : "Quiz"} · <span className="tabular">{h.score}/{h.total}</span>
                      </p>
                      <p className="text-xs text-ink-soft">{new Date(h.submitted_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    <span className="flex items-center gap-1 text-ink-soft">
                      Report <Icon name="chevron" className="h-4 w-4" />
                    </span>
                  </button>
                </li>
              );
            })}
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
      <div className="glass sticky top-14 z-20 -mx-4 flex items-center gap-3 border-b border-line px-4 py-2.5 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <Ring value={(100 * remaining) / quiz.duration_seconds} size={46} stroke={5} tone={low ? "bad" : "accent"}>
          <Icon name="clock" className={`h-4 w-4 ${low ? "text-bad" : "text-accent"}`} />
        </Ring>
        <div className="min-w-0">
          <p className={`font-display text-2xl font-semibold leading-none tabular ${low ? "text-bad" : ""}`} aria-live={low ? "polite" : "off"}>
            {clock(remaining)}
          </p>
          <p className="text-xs text-ink-soft tabular">
            {answered}/{quiz.questions.length} answered
          </p>
        </div>
        <div className="mx-2 hidden flex-1 sm:block">
          <ProgressBar value={(100 * answered) / quiz.questions.length} />
        </div>
        <Button
          className="ml-auto"
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

      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        <Card key={q.id} className="fade p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-ink tabular">{index + 1}</span>
            <Pill>{q.topic}</Pill>
            <Pill>{q.subtopic}</Pill>
          </div>
          <p className="mt-4 whitespace-pre-line font-display text-xl leading-snug sm:text-2xl">{q.body}</p>
          <ul className="mt-6 flex flex-col gap-2.5">
            {q.options.map((option, i) => {
              const chosen = answers[q.id] === option;
              return (
                <li key={option} className="rise" style={{ "--i": i } as CSSProperties}>
                  <button
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: option }))}
                    aria-pressed={chosen}
                    className={`press flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left ${
                      chosen ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]" : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/60"
                    }`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-xs font-medium ${chosen ? "border-transparent bg-accent text-accent-ink" : "border-line bg-surface-2 text-ink-soft"}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex items-center justify-between gap-2">
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
                Clear
              </Button>
            )}
            <Button variant={index === quiz.questions.length - 1 ? "secondary" : "primary"} onClick={() => go(index + 1)} disabled={index === quiz.questions.length - 1}>
              Next →
            </Button>
          </div>
        </Card>
        <Card className="self-start md:sticky md:top-32 lg:top-24">
          <Label>Questions</Label>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {quiz.questions.map((item, i) => (
              <button
                key={item.id}
                onClick={() => go(i)}
                aria-label={`Question ${i + 1}${answers[item.id] ? ", answered" : ""}`}
                className={`press h-9 rounded-md border text-sm font-medium tabular ${
                  i === index
                    ? "border-ink text-ink ring-2 ring-ink/15"
                    : answers[item.id]
                      ? "border-transparent bg-accent text-accent-ink"
                      : "border-line bg-surface text-ink-soft hover:border-line-strong"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-1.5 text-xs text-ink-soft">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-accent" /> Answered
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-line" /> Not answered
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Report({ report, onDone }: { report: QuizReport; onDone: () => void }) {
  const { t } = useT();
  const [burst] = useState(() => (report.accuracy >= 70 ? 1 : 0));
  const tone = report.accuracy >= 60 ? "accent" : report.accuracy >= 35 ? "marker" : "bad";
  const verdict = report.accuracy >= 80 ? "Outstanding!" : report.accuracy >= 60 ? "Solid work" : report.accuracy >= 35 ? "Getting there" : "Lots to learn from this one";

  return (
    <div className="flex flex-col gap-5">
      <Confetti burst={burst} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label>{report.kind === "mock" ? "Mock test report" : "Quiz report"}</Label>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{verdict}</h1>
        </div>
        <Button variant="secondary" onClick={onDone}>
          ← Back to tests
        </Button>
      </div>

      <Card className="rise grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <Ring value={report.accuracy} size={150} stroke={13} tone={tone}>
          <div>
            <p className="font-display text-4xl font-semibold tabular">
              {report.score}
              <span className="text-lg text-ink-soft">/{report.total}</span>
            </p>
            <p className="text-xs font-medium text-ink-soft tabular">{report.accuracy}% accuracy</p>
          </div>
        </Ring>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-paper p-4">
            <Label>Time used</Label>
            <p className="mt-1 font-display text-2xl font-semibold tabular">{clock(report.time_used_ms / 1000)}</p>
            <p className="text-xs text-ink-soft tabular">of {clock(report.duration_seconds)}</p>
          </div>
          <div className="rounded-xl border border-line bg-paper p-4">
            <Label>Per question</Label>
            <p className="mt-1 font-display text-2xl font-semibold tabular">{report.total ? Math.round(report.time_used_ms / report.total / 1000) : 0}s</p>
            <p className="text-xs text-ink-soft">average</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card className="rise" style={{ "--i": 1 } as CSSProperties}>
          <Label>Section-wise</Label>
          <ul className="mt-4 flex flex-col gap-5">
            {report.sections.map((s, i) => (
              <li key={s.topic} style={{ "--i": i } as CSSProperties}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">{s.topic}</span>
                  <span className="tabular text-ink-soft">
                    <span className="font-semibold text-ink">
                      {s.correct}/{s.total}
                    </span>{" "}
                    · {s.total ? Math.round(s.time_ms / s.total / 1000) : 0}s avg
                  </span>
                </div>
                <ProgressBar value={s.total ? (100 * s.correct) / s.total : 0} thick />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="rise" style={{ "--i": 2 } as CSSProperties}>
          <Label>Skills to work on</Label>
          {report.weak_skills.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">No misses. Try a harder mix next time.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {report.weak_skills.map((w, i) => (
                <li key={w.skill} className="pop flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2" style={{ "--i": i } as CSSProperties}>
                  <span className="truncate">{w.skill}</span>
                  <Pill tone="bad">missed {w.missed}</Pill>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-ink-soft">These now carry more weight in your adaptive practice.</p>
        </Card>
      </div>

      <Card className="rise" style={{ "--i": 3 } as CSSProperties}>
        <Label>{t("tests.review")}</Label>
        <ol className="mt-3 flex flex-col gap-2">
          {report.questions.map((item, i) => (
            <li key={item.question.id}>
              <details className="group rounded-xl border border-line bg-surface transition open:border-line-strong">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-semibold ${
                      item.is_correct ? "bg-good-soft text-good" : item.chosen_answer ? "bg-bad-soft text-bad" : "bg-surface-2 text-ink-soft"
                    }`}
                  >
                    {item.is_correct ? <Icon name="check" className="h-4 w-4" /> : item.chosen_answer ? <Icon name="x" className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">{item.question.body}</span>
                  <Icon name="arrow" className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-90" />
                </summary>
                <div className="flex flex-col gap-2 px-3 pb-4 pl-14 text-sm">
                  {!item.is_correct && (
                    <p>
                      Your answer: <span className="font-medium text-bad">{item.chosen_answer ?? "Skipped"}</span>
                    </p>
                  )}
                  <p>
                    Correct answer: <span className="font-medium text-good">{item.correct_option}</span>
                  </p>
                  <p className="whitespace-pre-line rounded-lg border border-line bg-paper p-3 leading-relaxed">{item.explanation}</p>
                </div>
              </details>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
