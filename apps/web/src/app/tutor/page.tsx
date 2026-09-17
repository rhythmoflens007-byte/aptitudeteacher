"use client";

import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import TutorAvatar from "@/components/TutorAvatar";
import TutorCustomizer from "@/components/TutorCustomizer";
import { Button, ErrorNote, Icon, SparkGlow } from "@/components/ui";
import { api, Locale, TutorMessage, TutorSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, useT } from "@/lib/i18n";
import { sentenceLines, useSpeechRecognition } from "@/lib/speech";
import { useTutor } from "@/lib/tutor";
import type { Mood } from "@/lib/tutorRig";
import { useMedia } from "@/lib/useMedia";
import { useTutorVoice } from "@/lib/useTutorVoice";

const SPEAK_PREF = "aptitude.tutor.speak";
const SPRING = { type: "spring", stiffness: 340, damping: 28 } as const;

type SessionSummary = Omit<TutorSession, "messages">;

export default function TutorPage() {
  return (
    <AppShell wide>
      <Tutor />
    </AppShell>
  );
}

/** Renders a reply sentence by sentence so the one being spoken can be highlighted. */
function SpokenText({ text, active }: { text: string; active: number }) {
  let index = 0;
  return (
    <>
      {sentenceLines(text).map((line, l) => (
        <span key={l} className="block min-h-[0.75em]">
          {line.map((sentence) => {
            const i = index++;
            return (
              <span key={i} className={`rounded-lg transition-all duration-300 ${i === active ? "bg-sun-soft text-ink shadow-[0_0_0_4px_var(--sun-soft)]" : ""}`}>
                {sentence}{" "}
              </span>
            );
          })}
        </span>
      ))}
    </>
  );
}

function Tutor() {
  const { t, speechLang, language } = useT();
  const { updateProfile } = useAuth();
  const tutor = useTutor();
  const voice = useTutorVoice();
  const mic = useSpeechRecognition(speechLang);
  const wide = useMedia("(min-width: 1280px)");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [session, setSession] = useState<TutorSession | null>(null);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [customising, setCustomising] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // Tutor only renders client-side (AppShell waits for auth), so reading storage here is safe.
  const [speakReplies, setSpeakReplies] = useState(() => {
    try {
      return localStorage.getItem(SPEAK_PREF) !== "off";
    } catch {
      return true;
    }
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const explained = useRef(new Set<string>());
  const sending = useRef(false);

  const refreshSessions = useCallback(() => {
    api<SessionSummary[]>("/tutor/sessions").then(setSessions).catch(() => {});
  }, []);

  const send = useCallback(
    async (content: string, target: TutorSession | null = session) => {
      const text = content.trim();
      if (!text || sending.current) return;
      sending.current = true;
      voice.stop();
      setError(null);
      setDraft("");
      setWaiting(true);
      try {
        let active = target;
        if (!active) {
          active = await api<TutorSession>("/tutor/sessions", { method: "POST", json: {} });
          window.history.replaceState(null, "", `/tutor?session=${active.id}`);
        }
        const pending: TutorMessage = { id: `local-${Date.now()}`, role: "student", content: text, created_at: new Date().toISOString() };
        setSession({ ...active, messages: [...active.messages, pending] });
        const reply = await api<TutorMessage>(`/tutor/sessions/${active.id}/messages`, { method: "POST", json: { content: text } });
        setSession((s) => (s ? { ...s, messages: [...s.messages, reply] } : s));
        if (speakReplies) voice.say(reply.content, reply.id, tutor.gender, reply.emotions ?? []);
        refreshSessions();
      } catch (e) {
        setDraft(text);
        setError(e instanceof Error ? e.message : "Message didn't send.");
      } finally {
        sending.current = false;
        setWaiting(false);
      }
    },
    [refreshSessions, session, speakReplies, voice, tutor.gender],
  );

  // A conversation opened from a question (practice, a photo) starts with the tutor explaining it.
  const explainIfNew = useCallback(
    (opened: TutorSession) => {
      const hasQuestion = opened.question_id || opened.question_text;
      if (!hasQuestion || opened.messages.length || explained.current.has(opened.id)) return;
      explained.current.add(opened.id);
      send(t("tutor.explainRequest"), opened);
    },
    [send, t],
  );

  const openSession = useCallback(
    async (id: string) => {
      voice.stop();
      try {
        const opened = await api<TutorSession>(`/tutor/sessions/${id}`);
        setSession(opened);
        setError(null);
        setHistoryOpen(false);
        window.history.replaceState(null, "", `/tutor?session=${id}`);
        explainIfNew(opened);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't open that conversation.");
      }
    },
    [explainIfNew, voice],
  );

  const firstLoad = useRef(true);
  useEffect(() => {
    if (!firstLoad.current) return;
    firstLoad.current = false;
    api<{ ai_enabled: boolean }>("/tutor/status").then((s) => setAiEnabled(s.ai_enabled)).catch(() => {});
    refreshSessions();
    const id = new URLSearchParams(window.location.search).get("session");
    if (id)
      api<TutorSession>(`/tutor/sessions/${id}`)
        .then((opened) => {
          setSession(opened);
          explainIfNew(opened);
        })
        .catch((e) => setError(e.message));
  }, [explainIfNew, refreshSessions]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [session?.messages.length, waiting]);

  function toggleSpeak() {
    const next = !speakReplies;
    setSpeakReplies(next);
    if (!next) voice.stop();
    try {
      localStorage.setItem(SPEAK_PREF, next ? "on" : "off");
    } catch {}
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  function toggleMic() {
    if (mic.listening) {
      mic.stop();
      return;
    }
    voice.stop();
    mic.start((text) => send(text));
  }

  async function onPhoto(file: File) {
    setError(null);
    setWaiting(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const created = await api<TutorSession>("/tutor/ocr", { method: "POST", body: form });
      setSession(created);
      window.history.replaceState(null, "", `/tutor?session=${created.id}`);
      refreshSessions();
      setWaiting(false);
      explainIfNew(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that photo.");
      setWaiting(false);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function newChat() {
    voice.stop();
    setSession(null);
    setHistoryOpen(false);
    window.history.replaceState(null, "", "/tutor");
  }

  async function changeLanguage(code: Locale) {
    voice.stop();
    try {
      await updateProfile({ locale: code });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change the language.");
    }
  }

  // Typing makes the tutor lean in and nod along.
  const mood: Mood = mic.listening || (draft.trim() && !waiting) ? "listening" : waiting ? "thinking" : voice.speaking ? "neutral" : "neutral";
  const context = session?.question_text ?? (session?.question_id ? session.title : null);
  const listeningText = tutor.gender === "female" ? t("tutor.listeningFemale") : t("tutor.listening");
  const status = mic.listening
    ? mic.interim || listeningText
    : waiting
      ? "Hmm, thinking…"
      : voice.speaking
        ? "Explaining · tap the mic to jump in"
        : draft.trim()
          ? "I'm listening…"
          : "Type, talk, or snap a photo";
  const missingLanguage = voice.missingVoice ? LANGUAGES.find((l) => l.speech.split("-")[0] === voice.missingVoice!.split("-")[0]) : null;
  const glowing = voice.speaking || waiting || mic.listening;

  const sessionList = (
    <ul className="flex flex-col gap-1">
      {sessions.map((s, i) => (
        <motion.li key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: Math.min(i, 8) * 0.03 }}>
          <button
            onClick={() => openSession(s.id)}
            className={`press w-full rounded-2xl px-3 py-2.5 text-left text-sm ${session?.id === s.id ? "bg-iris-soft text-ink" : "text-ink-soft hover:bg-surface-2 hover:text-ink"}`}
          >
            <span className="line-clamp-2 font-medium" dir="auto">
              {s.title}
            </span>
            <span className="text-[11px] opacity-70">{new Date(s.started_at).toLocaleDateString()}</span>
          </button>
        </motion.li>
      ))}
      {sessions.length === 0 && <li className="px-3 py-2 text-sm text-ink-soft">No conversations yet.</li>}
    </ul>
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5 xl:sticky xl:top-8 xl:self-start">
        <SparkGlow active={glowing} className="rounded-[32px]">
          <div className="overflow-hidden rounded-[32px] bg-surface shadow-[var(--shadow-md)]">
            <div className="flex items-center gap-4 p-4 xl:flex-col xl:gap-0 xl:p-0">
              <div className="shrink-0 bg-gradient-to-b from-iris-soft via-[#f7f2ff] to-surface xl:w-full">
                <TutorAvatar gender={tutor.gender} voice={voice} mood={mood} framing={wide ? "full" : "portrait"} className="aspect-square w-28 sm:w-36 xl:aspect-[4/5] xl:w-full" />
              </div>
              <div className="min-w-0 flex-1 xl:w-full xl:px-5 xl:pt-3 xl:text-center">
                <h1 className="flex items-center gap-2 font-display text-3xl xl:justify-center">
                  {tutor.name}
                  <span className={`h-2.5 w-2.5 rounded-full ${aiEnabled ? "bg-success" : "bg-sun"} ${glowing ? "animate-pulse" : ""}`} title={aiEnabled ? "AI online" : "Offline mode"} />
                </h1>
                <AnimatePresence mode="wait">
                  <motion.p key={status} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="min-h-6 text-ink-soft" aria-live="polite">
                    {status}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-4 pb-5 xl:justify-center">
              <label className="flex items-center gap-2 rounded-full bg-surface-2 py-1.5 pl-3 pr-2 text-sm font-medium">
                <Icon name="globe" className="h-4 w-4 text-iris" />
                <span className="sr-only">{t("tutor.language")}</span>
                <select id="tutor-language" value={language.code} onChange={(e) => changeLanguage(e.target.value as Locale)} className="rounded-full bg-transparent pr-1 outline-none">
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={toggleSpeak} role="switch" aria-checked={speakReplies} className="press flex items-center gap-2 rounded-full bg-surface-2 py-1.5 pl-1.5 pr-3 text-sm font-medium">
                <span className={`relative h-6 w-10 rounded-full transition-colors duration-300 ${speakReplies ? "bg-success" : "bg-line-strong"}`}>
                  <motion.span layout transition={SPRING} className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${speakReplies ? "right-0.5" : "left-0.5"}`} />
                </span>
                {t("tutor.speak")}
              </button>
              {voice.speaking && (
                <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={voice.stop}>
                  <Icon name="stop" className="h-4 w-4" /> Stop
                </Button>
              )}
              <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => setCustomising(true)}>
                <Icon name="settings" className="h-4 w-4" /> {t("tutor.customise")}
              </Button>
              <Button variant="secondary" className="px-3 py-1.5 text-sm xl:hidden" onClick={() => setHistoryOpen(true)}>
                <Icon name="history" className="h-4 w-4" /> {t("tutor.history")}
              </Button>
            </div>
            {missingLanguage && (
              <p className="mx-4 mb-4 rounded-2xl bg-sun-soft px-4 py-3 text-xs">
                This browser has no {missingLanguage.english} voice, so {tutor.name} may sound off. Microsoft Edge has natural voices for Indian languages — the written reply is always shown.
              </p>
            )}
          </div>
        </SparkGlow>

        <div className="hidden rounded-[32px] bg-surface p-3 shadow-[var(--shadow-md)] xl:block">
          <div className="mb-2 flex items-center justify-between px-2 pt-1">
            <p className="font-semibold">{t("tutor.history")}</p>
            <button onClick={newChat} className="press flex items-center gap-1 rounded-full bg-iris-soft px-3 py-1 text-sm font-semibold text-iris">
              <Icon name="plus" className="h-4 w-4" /> New
            </button>
          </div>
          <div className="no-scrollbar max-h-[26vh] overflow-y-auto" data-lenis-prevent>
            {sessionList}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-4">
        {!aiEnabled && (
          <p className="flex items-start gap-3 rounded-3xl bg-sun-soft px-5 py-4 text-sm">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-sun-600" />
            <span>
              <strong>Offline mode.</strong> {tutor.name} can read out worked solutions but can&apos;t chat until a free Gemini key is added to <code className="rounded bg-surface px-1">apps/api/.env</code>.
            </span>
          </p>
        )}

        <div className="flex flex-col overflow-hidden rounded-[32px] bg-surface shadow-[var(--shadow-md)] xl:h-[calc(100dvh-5.5rem)]">
          <div className="flex items-center justify-between gap-2 border-b border-line px-6 py-4">
            <p className="truncate font-semibold" dir="auto">
              {session ? session.title : t("tutor.newChat")}
            </p>
            {session && (
              <button onClick={newChat} className="press flex shrink-0 items-center gap-1 rounded-full bg-iris-soft px-3 py-1 text-sm font-semibold text-iris">
                <Icon name="plus" className="h-4 w-4" /> New
              </button>
            )}
          </div>

          {context && (
            <div className="flex items-start gap-3 border-b border-line bg-gradient-to-r from-iris-soft to-surface px-6 py-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-iris">The question we&apos;re on</p>
                <p className="mt-1 line-clamp-4 whitespace-pre-line" dir="auto">
                  {context}
                </p>
              </div>
              <Button variant="secondary" className="shrink-0 px-3 py-1.5 text-sm" onClick={() => send(t("tutor.explainRequest"))} disabled={waiting}>
                <Icon name="speaker" className="h-4 w-4" /> <span className="hidden sm:inline">{t("tutor.explain")}</span>
              </Button>
            </div>
          )}

          <div ref={scroller} data-lenis-prevent className="flex min-h-[360px] flex-1 flex-col gap-3 overflow-y-auto px-4 py-6 sm:px-6">
            {(!session || session.messages.length === 0) && !waiting && (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} className="m-auto flex flex-col items-center gap-5 py-6 text-center">
                <motion.span animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }} className="grid h-16 w-16 place-items-center rounded-3xl bg-spark text-white shadow-[var(--shadow-md)]">
                  <Icon name="sparkles" className="h-8 w-8" />
                </motion.span>
                <div>
                  <p className="font-display text-3xl">What shall we crack today?</p>
                  <p className="mt-1 text-ink-soft">
                    {tutor.name} explains out loud in {language.english}. Pick one, or ask your own.
                  </p>
                </div>
                <div className="flex max-w-xl flex-wrap justify-center gap-2">
                  {["What's the shortcut for work problems?", "How do syllogisms with 'some' work?", "Why isn't average speed (x + y) / 2?"].map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: 0.1 + i * 0.08 }}
                      whileHover={{ y: -3 }}
                      onClick={() => send(s)}
                      className="rounded-full bg-surface-2 px-4 py-2.5 text-sm font-medium hover:bg-iris-soft hover:text-iris"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
            <AnimatePresence initial={false}>
              {session?.messages.map((m) => {
                const live = voice.activeKey === m.id;
                const mine = m.role === "student";
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.94, x: mine ? 20 : -20 }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                    transition={SPRING}
                    className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                  >
                    {!mine && (
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-spark text-xs font-bold text-white transition-shadow ${live ? "shadow-[0_0_0_4px_rgb(155_92_246/0.25)]" : ""}`}>
                        {tutor.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div
                      dir="auto"
                      className={`max-w-[85%] rounded-[26px] px-5 py-3 text-[16px] leading-relaxed ${
                        mine ? "whitespace-pre-line rounded-br-lg bg-iris text-white shadow-[var(--shadow-iris)]" : `rounded-bl-lg bg-surface-2 ${live ? "ring-2 ring-violet/30" : ""}`
                      }`}
                    >
                      {mine ? m.content : <SpokenText text={m.content} active={live ? voice.sentence : -1} />}
                      {!mine && (
                        <button
                          onClick={() => (live ? voice.stop() : voice.say(m.content, m.id, tutor.gender, m.emotions ?? []))}
                          className="mt-2 flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-iris"
                          aria-label={live ? "Stop reading this reply" : "Read this reply aloud"}
                        >
                          <Icon name={live ? "stop" : "speaker"} className="h-3.5 w-3.5" /> {live ? "Stop" : "Listen"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {waiting && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-spark text-xs font-bold text-white">{tutor.name.charAt(0).toUpperCase()}</span>
                <div className="flex items-center gap-1.5 rounded-[26px] rounded-bl-lg bg-surface-2 px-5 py-4" aria-label={`${tutor.name} is typing`}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="typing-dot h-2 w-2 rounded-full bg-violet" style={{ ["--i" as string]: i }} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-3 sm:p-4">
            <ErrorNote message={error ?? mic.error} />
            <SparkGlow active={focused || mic.listening} className={`rounded-[28px] ${error || mic.error ? "mt-3" : ""}`}>
              <form onSubmit={onSubmit} className="flex items-end gap-2 rounded-[28px] bg-surface-2 p-2">
                <input
                  ref={fileInput}
                  id="photo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/heic"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={waiting}
                  aria-label={t("tutor.photo")}
                  title={t("tutor.photo")}
                  className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-ink-soft shadow-[var(--shadow-xs)] hover:text-coral disabled:opacity-50"
                >
                  <Icon name="camera" />
                </button>
                <textarea
                  id="tutor-draft"
                  dir="auto"
                  value={mic.listening ? mic.interim : draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(draft);
                    }
                  }}
                  rows={1}
                  placeholder={mic.listening ? listeningText : t("tutor.placeholder")}
                  className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[16px] outline-none placeholder:text-ink-faint"
                />
                {mic.supported && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-label={mic.listening ? "Stop listening" : "Speak your question"}
                    title={mic.listening ? "Stop listening" : "Speak your question"}
                    className={`press relative grid h-11 w-11 shrink-0 place-items-center rounded-full ${mic.listening ? "bg-coral text-white" : "bg-surface text-ink-soft shadow-[var(--shadow-xs)] hover:text-iris"}`}
                  >
                    {mic.listening && <span className="absolute inset-0 animate-ping rounded-full bg-coral/40" />}
                    <Icon name={mic.listening ? "stop" : "mic"} className="relative h-5 w-5" />
                  </button>
                )}
                <Button type="submit" variant="spark" disabled={waiting || !draft.trim()} className="h-11 w-11 shrink-0 p-0 sm:w-auto sm:px-5" aria-label={t("tutor.send")}>
                  <Icon name="send" className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tutor.send")}</span>
                </Button>
              </form>
            </SparkGlow>
            {!mic.supported && <p className="mt-2 px-2 text-xs text-ink-soft">Voice input works in Chrome and Edge.</p>}
          </div>
        </div>
      </section>

      <Modal open={customising} title={t("tutor.customise")} onClose={() => setCustomising(false)}>
        <TutorCustomizer onSaved={() => setTimeout(() => setCustomising(false), 900)} />
      </Modal>

      <Modal open={historyOpen} title={t("tutor.history")} onClose={() => setHistoryOpen(false)}>
        <Button variant="secondary" className="mb-3 w-full" onClick={newChat}>
          <Icon name="plus" className="h-4 w-4" /> {t("tutor.newChat")}
        </Button>
        {sessionList}
      </Modal>
    </div>
  );
}
