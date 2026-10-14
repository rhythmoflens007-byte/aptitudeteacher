"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useToast } from "@/components/Toast";
import TutorAvatar from "@/components/TutorAvatar";
import { Button, Confetti, DIFFICULTY_KEYS, ErrorNote, ErrorState, Icon, MISCONCEPTION_KEYS, PageHeader, Pill, ProgressBar, Segmented, Skeleton, SparkGlow } from "@/components/ui";
import { patchGame, refreshGame } from "@/lib/game";
import { api, AttemptResult, optionLabel, Question, Topic, TutorSession } from "@/lib/api";
import { Key, useT } from "@/lib/i18n";
import { useTutor } from "@/lib/tutor";
import type { Mood } from "@/lib/tutorRig";
import { useMedia } from "@/lib/useMedia";
import { useTutorVoice } from "@/lib/useTutorVoice";

type Reason = "retest" | "weakest_skill" | "new_skill" | "plan";

const REASON: Record<Reason, { text: Key; icon: string; tone: "sun" | "coral" | "lagoon" }> = {
  retest: { text: "practice.reason.retest", icon: "refresh", tone: "sun" },
  weakest_skill: { text: "practice.reason.weakest", icon: "target", tone: "coral" },
  new_skill: { text: "practice.reason.new", icon: "sparkles", tone: "lagoon" },
  plan: { text: "practice.reason.plan", icon: "layers", tone: "lagoon" },
};

const OPTION_TINTS = ["bg-iris", "bg-coral", "bg-lagoon", "bg-sun"];
const SPRING = { type: "spring", stiffness: 300, damping: 26 } as const;

export default function PracticePage() {
  return (
    <AppShell wide>
      <Practice />
    </AppShell>
  );
}

function Practice() {
  const { t, tn, errorText } = useT();
  const tutor = useTutor();
  const router = useRouter();
  const toast = useToast();
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
  const wide = useMedia("(min-width: 1280px)");

  const show = useCallback(
    (q: Question, r: Reason) => {
      stopVoice();
      setQuestion(q);
      setReason(r);
      setSelected(null);
      setResult(null);
      setError(null);
      setQKey((k) => k + 1);
      startedAt.current = Date.now();
      setElapsed(0);
    },
    [stopVoice],
  );

  // A skill from the revision plan (/practice?skill=…) keeps every question on that skill until cleared.
  const [planSkill, setPlanSkill] = useState<string | null>(null);
  const planSkillRef = useRef<string | null>(null);

  const fetchNext = useCallback(
    async (topic: string | null) => {
      try {
        const skill = planSkillRef.current;
        const query = skill ? `?skill_id=${encodeURIComponent(skill)}` : topic ? `?topic_id=${topic}` : "";
        const res = await api<{ question: Question; reason: Reason }>(`/questions/next${query}`);
        show(res.question, res.reason);
      } catch (e) {
        setError(errorText(e));
      } finally {
        setBusy(false);
      }
    },
    [show, errorText],
  );

  function loadNext(topic: string | null) {
    setBusy(true);
    void fetchNext(topic);
  }

  function leavePlan() {
    planSkillRef.current = null;
    setPlanSkill(null);
    window.history.replaceState(null, "", "/practice");
    loadNext(topicId);
  }

  useEffect(() => {
    api<Topic[]>("/topics").then(setTopics).catch(() => {});
    const skill = new URLSearchParams(window.location.search).get("skill");
    planSkillRef.current = skill;
    api<{ question: Question; reason: Reason }>(skill ? `/questions/next?skill_id=${encodeURIComponent(skill)}` : "/questions/next")
      .then((res) => {
        if (skill) setPlanSkill(res.question.skills[0] ?? null);
        show(res.question, res.reason);
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setBusy(false));
  }, [show, errorText]);

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
        if (typeof res.hearts === "number") patchGame({ hearts: res.hearts });
        void refreshGame();
        setResult(res);
        if (res.is_correct) setConfetti((n) => n + 1);
        if (res.xp_gained) toast({ title: t("practice.xp", { n: res.xp_gained }), detail: res.is_correct ? t("practice.niceDone") : t("practice.everyTry"), icon: "bolt", tone: "sun" });
        for (const badge of res.new_badges) {
          setConfetti((n) => n + 1);
          toast({ title: t("practice.badge", { name: tn(`badge.${badge.code}.name`, badge.name) }), detail: tn(`badge.${badge.code}.desc`, badge.description), icon: "trophy", tone: "iris" });
        }
        if (res.daily_goal_completed === res.daily_goal_target) toast({ title: t("practice.goalDone"), icon: "flame", tone: "coral" });
      } catch (e) {
        setError(errorText(e));
      } finally {
        setBusy(false);
      }
    },
    [question, result, busy, toast, t, tn, errorText],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!question || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const n = Number(e.key);
      if (!result && n >= 1 && n <= question.options.length) setSelected(question.options[n - 1]);
      if (e.key === "Enter" && !result && selected && !(e.target instanceof HTMLButtonElement)) submit(selected);
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
      setError(errorText(e));
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
      setError(errorText(e));
    }
  }

  const checking = busy && !!selected && !result;
  const mood: Mood = checking ? "thinking" : !result ? (selected ? "listening" : "neutral") : result.is_correct ? "happy" : "concerned";
  const reasonInfo = REASON[reason];
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");
  const status = !result
    ? checking
      ? t("practice.status.checking")
      : selected
        ? t("practice.status.picked")
        : t("practice.status.idle")
    : voice.speaking
      ? t("practice.status.explaining", { gender: tutor.gender })
      : result.is_correct
        ? t("practice.status.right")
        : result.micro_lesson
          ? t("practice.status.lesson")
          : t("practice.status.close");

  return (
    <div className="flex flex-col gap-6">
      <Confetti burst={confetti} />

      <PageHeader
        eyebrow={t("practice.eyebrow", { name: tutor.name, gender: tutor.gender })}
        title={t("practice.title")}
        actions={
          <div className="no-scrollbar -mx-4 flex max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Segmented
              id="practice-topic"
              label={t("practice.filter")}
              value={topicId}
              options={[{ value: null, label: t("practice.all") }, ...topics.map((tp) => ({ value: tp.id as string | null, label: tn(tp.name) }))]}
              onChange={(id) => {
                planSkillRef.current = null;
                setPlanSkill(null);
                setTopicId(id);
                loadNext(id);
              }}
            />
          </div>
        }
      />

      {planSkill && (
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-lagoon-soft px-5 py-3 text-sm" role="status">
          <Icon name="layers" className="h-4 w-4 shrink-0 text-lagoon-600" />
          <span className="min-w-0 flex-1">{t("plan.practising", { skill: tn(planSkill) })}</span>
          <button onClick={leavePlan} className="press rounded-full bg-surface px-3 py-1.5 text-xs font-semibold ring-1 ring-hairline">
            {t("plan.leave")}
          </button>
        </div>
      )}

      {question && <ErrorNote message={error} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {!question && error ? (
            <ErrorState message={error} onRetry={() => fetchNext(topicId)} />
          ) : !question ? (
            <div className="flex flex-col gap-4 rounded-[32px] bg-surface p-8 shadow-[var(--shadow-md)]" aria-busy aria-label={t("common.loading")}>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-20" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            </div>
          ) : (
            <SparkGlow active={checking} className="rounded-[32px]">
              <motion.div
                key={qKey}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={SPRING}
                className="rounded-[32px] bg-surface p-6 shadow-[var(--shadow-md)] sm:p-9"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={reasonInfo.tone}>
                    <Icon name={reasonInfo.icon} className="h-3.5 w-3.5" />
                    {t(reasonInfo.text)}
                  </Pill>
                  <Pill>{tn(question.subtopic)}</Pill>
                  <Pill>
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} aria-hidden className={`h-1.5 w-1.5 rounded-full ${i < question.difficulty ? "bg-coral" : "bg-line-strong"}`} />
                    ))}
                    <span className="ml-1">{t(DIFFICULTY_KEYS[question.difficulty] ?? "difficulty.3")}</span>
                  </Pill>
                  {question.source === "ai_generated" && <Pill tone="iris">✨ {t("practice.freshAi")}</Pill>}
                  {question.source === "generated" && <Pill tone="violet">✨ {t("practice.brandNew")}</Pill>}
                  <span
                    className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular ${result ? "text-ink-soft" : elapsed > 90 ? "bg-coral-soft text-coral-600" : "bg-surface-2 text-ink-soft"}`}
                    role="timer"
                    aria-label={t("practice.timeLabel")}
                  >
                    <Icon name="clock" className="h-4 w-4" /> {minutes}:{seconds}
                  </span>
                </div>
                <p className="mt-6 text-sm font-semibold text-ink-soft">{tn(question.topic)}</p>
                <h2 className="mt-2 whitespace-pre-line font-display text-2xl leading-snug sm:text-[32px] sm:leading-tight">{question.body}</h2>

                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {question.options.map((option, i) => {
                    const isCorrect = !!result && option === result.correct_option;
                    const isWrongPick = !!result && option === selected && !result.is_correct;
                    const picked = !result && option === selected;
                    const dim = !!result && !isCorrect && !isWrongPick;
                    return (
                      <motion.li key={option} initial={{ opacity: 0, y: 12 }} animate={{ opacity: dim ? 0.45 : 1, y: 0 }} transition={{ ...SPRING, delay: 0.05 * i }}>
                        <motion.button
                          whileHover={!result ? { y: -3 } : undefined}
                          whileTap={!result ? { scale: 0.97 } : undefined}
                          animate={isWrongPick ? { x: [0, -8, 8, -5, 5, 0] } : isCorrect ? { scale: [1, 1.04, 1] } : undefined}
                          transition={{ duration: 0.45 }}
                          disabled={!!result || busy}
                          onClick={() => setSelected(option)}
                          aria-pressed={picked}
                          className={`group flex w-full items-center gap-3 rounded-3xl px-4 py-4 text-left text-[17px] font-medium ring-2 transition-colors duration-300 disabled:cursor-default ${
                            isCorrect
                              ? "bg-success-soft ring-success"
                              : isWrongPick
                                ? "bg-danger-soft ring-danger"
                                : picked
                                  ? "bg-iris-soft ring-iris shadow-[var(--shadow-iris)]"
                                  : "bg-surface-2 ring-transparent hover:bg-surface hover:ring-line-strong"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white transition-transform duration-500 group-hover:rotate-6 ${
                              isCorrect ? "bg-success" : isWrongPick ? "bg-danger" : picked ? "bg-iris" : OPTION_TINTS[i % 4]
                            }`}
                          >
                            {isCorrect ? <Icon name="check" className="h-4 w-4" /> : isWrongPick ? <Icon name="x" className="h-4 w-4" /> : String.fromCharCode(65 + i)}
                          </span>
                          {optionLabel(question, option)}
                          {isCorrect &&<span className="sr-only">({t("practice.correctAnswer")})</span>}
                          {isWrongPick && <span className="sr-only">({t("practice.yourWrongAnswer")})</span>}
                        </motion.button>
                      </motion.li>
                    );
                  })}
                </ul>

                {!result && (
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Button variant="spark" onClick={() => submit(selected)} disabled={!selected || busy} className="px-7 py-3.5">
                      {checking ? t("practice.checking") : t("practice.submit")}
                      {!checking && <Icon name="arrow" className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" onClick={() => submit(null)} disabled={busy}>
                      {t("practice.skip")}
                    </Button>
                    <span className="ml-auto hidden text-xs text-ink-soft sm:inline">
                      <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 font-sans">1</kbd>–<kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 font-sans">4</kbd> {t("practice.kbdChoose")} ·{" "}
                      <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 font-sans">Enter</kbd> {t("practice.kbdCheck")}
                    </span>
                  </div>
                )}
              </motion.div>
            </SparkGlow>
          )}

          <AnimatePresence>
            {result && question && (
              <motion.div key={`result-${qKey}`} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={SPRING} className="flex flex-col gap-5" aria-live="polite">
                <div className={`relative overflow-hidden rounded-[32px] p-6 shadow-[var(--shadow-md)] sm:p-8 ${result.is_correct ? "bg-gradient-to-br from-success-soft via-surface to-surface" : "bg-gradient-to-br from-coral-soft via-surface to-surface"}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <motion.span
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 14 }}
                      aria-hidden
                      className={`grid h-12 w-12 place-items-center rounded-2xl text-white ${result.is_correct ? "bg-success" : "bg-coral"}`}
                    >
                      <Icon name={result.is_correct ? "check" : "x"} className="h-6 w-6" />
                    </motion.span>
                    <p className="font-display text-3xl">{result.is_correct ? t("practice.correct") : t("practice.incorrect")}</p>
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.2 }}>
                      <Pill tone="sun">
                        <Icon name="bolt" className="h-3.5 w-3.5" />
                        {t("practice.xp", { n: result.xp_gained })}
                      </Pill>
                    </motion.span>
                    {result.misconception_type && <Pill tone="coral">{t(MISCONCEPTION_KEYS[result.misconception_type].title)}</Pill>}
                  </div>
                  {result.misconception_type && <p className="mt-3 text-ink-soft">{t(MISCONCEPTION_KEYS[result.misconception_type].hint)}</p>}
                  <div className="mt-6 rounded-3xl bg-surface p-5 shadow-[var(--shadow-sm)]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{t("practice.explanation")}</p>
                      <ListenButton active={voice.activeKey === "explanation"} onToggle={() => toggleListen(result.explanation, "explanation")} />
                    </div>
                    <p className="mt-3 whitespace-pre-line text-[16px] leading-relaxed" dir="auto">
                      {result.explanation}
                    </p>
                  </div>
                </div>

                {result.micro_lesson && (
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.12 }} className="relative overflow-hidden rounded-[32px] bg-surface p-6 shadow-[var(--shadow-md)] sm:p-8">
                    <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-spark" />
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-sun-soft text-sun-600">
                          <Icon name="book" className="h-[18px] w-[18px]" />
                        </span>
                        {t("practice.lesson")} · {tutor.name}
                      </p>
                      <ListenButton active={voice.activeKey === "lesson"} onToggle={() => toggleListen(result.micro_lesson!, "lesson")} />
                    </div>
                    <p className="mt-4 whitespace-pre-line text-[16px] leading-relaxed" dir="auto">
                      {result.micro_lesson}
                    </p>
                  </motion.div>
                )}

                <div className="flex flex-wrap gap-2">
                  {result.retest_question_id ? (
                    <>
                      <Button variant="spark" onClick={retest} disabled={busy} className="px-6 py-3.5">
                        <Icon name="refresh" className="h-4 w-4" />
                        {t("practice.retest")}
                      </Button>
                      <Button variant="secondary" onClick={() => loadNext(topicId)} disabled={busy}>
                        {t("practice.skipNext")}
                      </Button>
                    </>
                  ) : (
                    <Button variant="spark" onClick={() => loadNext(topicId)} disabled={busy} className="px-6 py-3.5">
                      {t("practice.next")} <Icon name="arrow" className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="secondary" onClick={askTutor}>
                    <Icon name="chat" className="h-4 w-4" />
                    {t("practice.askTutor")}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-8 xl:self-start" aria-label={t("practice.tutorPanel")}>
          <SparkGlow active={voice.speaking || checking} className="rounded-[32px]">
            <div className="flex items-center gap-4 overflow-hidden rounded-[32px] bg-surface p-4 shadow-[var(--shadow-md)] xl:flex-col xl:p-0">
              <div className="shrink-0 bg-gradient-to-b from-iris-soft to-surface xl:w-full">
                <TutorAvatar gender={tutor.gender} voice={voice} mood={voice.speaking ? "neutral" : mood} framing={wide ? "full" : "portrait"} className="aspect-square w-28 sm:w-36 xl:aspect-[4/5] xl:w-full" />
              </div>
              <div className="min-w-0 xl:px-6 xl:pb-6 xl:text-center">
                <p className="flex items-center gap-2 font-display text-2xl xl:justify-center">
                  {tutor.name}
                  <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
                </p>
                <AnimatePresence mode="wait">
                  <motion.p key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="text-ink-soft" aria-live="polite">
                    {status}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </SparkGlow>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING} className="rounded-[32px] bg-surface p-6 shadow-[var(--shadow-md)]">
                <p className="font-semibold">{t("practice.mastery")}</p>
                <ul className="mt-4 flex flex-col gap-4">
                  {result.mastery.map((m) => (
                    <li key={m.skill}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="truncate">{tn(m.skill)}</span>
                        <span className="font-bold tabular">{Math.round(m.score)}%</span>
                      </div>
                      <ProgressBar value={m.score} tone="spark" />
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{t("dash.goal")}</span>
                    <span className="font-bold tabular">
                      {Math.min(result.daily_goal_completed, result.daily_goal_target)} / {result.daily_goal_target}
                    </span>
                  </div>
                  <ProgressBar value={(100 * result.daily_goal_completed) / result.daily_goal_target} tone="coral" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}

function ListenButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const { t } = useT();
  return (
    <Button variant={active ? "primary" : "secondary"} className="shrink-0 px-4 py-2 text-sm" onClick={onToggle} aria-pressed={active}>
      <Icon name={active ? "stop" : "speaker"} className="h-4 w-4" />
      {active ? t("common.stop") : t("common.listen")}
    </Button>
  );
}
