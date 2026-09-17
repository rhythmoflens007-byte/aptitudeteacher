"use client";

import { CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import type { Mood } from "@/components/Avatar";
import Modal from "@/components/Modal";
import TutorAvatar from "@/components/TutorAvatar";
import TutorCustomizer from "@/components/TutorCustomizer";
import { Button, Card, ErrorNote, Icon, Label } from "@/components/ui";
import { api, Locale, TutorMessage, TutorSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, useT } from "@/lib/i18n";
import { sentenceLines, useSpeechRecognition } from "@/lib/speech";
import { useMedia } from "@/lib/useMedia";
import { useTutor } from "@/lib/tutor";
import { useTutorVoice } from "@/lib/useTutorVoice";

const SPEAK_PREF = "aptitude.tutor.speak";

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
              <span
                key={i}
                className={`rounded-md transition-colors duration-300 ${i === active ? "bg-marker-soft text-ink shadow-[0_0_0_3px_var(--marker-soft)]" : ""}`}
              >
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
        if (speakReplies) voice.say(reply.content, reply.id);
        refreshSessions();
      } catch (e) {
        setDraft(text);
        setError(e instanceof Error ? e.message : "Message didn't send.");
      } finally {
        sending.current = false;
        setWaiting(false);
      }
    },
    [refreshSessions, session, speakReplies, voice],
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

  const mood: Mood = mic.listening ? "listening" : waiting ? "thinking" : voice.speaking ? "neutral" : "happy";
  const context = session?.question_text ?? (session?.question_id ? session.title : null);
  const listeningText = tutor.gender === "female" ? t("tutor.listeningFemale") : t("tutor.listening");
  const status = mic.listening
    ? mic.interim || listeningText
    : waiting
      ? "Thinking…"
      : voice.speaking
        ? "Explaining · tap the mic to interrupt"
        : "Ask by typing, speaking, or sending a photo";
  const missingLanguage = voice.missingVoice ? LANGUAGES.find((l) => l.speech.split("-")[0] === voice.missingVoice!.split("-")[0]) : null;

  const sessionList = (
    <ul className="flex flex-col gap-1">
      {sessions.map((s, i) => (
        <li key={s.id} className="rise" style={{ "--i": Math.min(i, 8) } as CSSProperties}>
          <button
            onClick={() => openSession(s.id)}
            className={`press w-full rounded-lg px-3 py-2.5 text-left text-sm ${
              session?.id === s.id ? "bg-surface-2 text-ink shadow-[inset_0_0_0_1px_var(--line)]" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span className="line-clamp-2" dir="auto">
              {s.title}
            </span>
            <span className="text-[11px] opacity-70">{new Date(s.started_at).toLocaleDateString()}</span>
          </button>
        </li>
      ))}
      {sessions.length === 0 && <li className="px-3 py-2 text-sm text-ink-soft">No conversations yet.</li>}
    </ul>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 xl:sticky xl:top-8 xl:self-start">
        <Card className="relative overflow-hidden p-4 xl:p-5">
          <span aria-hidden className="bg-glow absolute inset-0" />
          <div className="relative flex items-center gap-4 xl:flex-col xl:gap-1">
            <TutorAvatar
              gender={tutor.gender}
              speaking={voice.speaking}
              viseme={voice.viseme}
              wordTick={voice.wordTick}
              gestureTick={voice.gestureTick}
              mood={mood}
              framing={wide ? "full" : "portrait"}
              className="aspect-square w-32 shrink-0 sm:w-40 xl:aspect-[4/5] xl:w-full"
            />
            <div className="min-w-0 flex-1 xl:w-full xl:text-center">
              <div className="flex items-center gap-2 xl:justify-center">
                <h1 className="truncate text-xl font-semibold tracking-tight">{tutor.name}</h1>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${aiEnabled ? "bg-good" : "bg-marker"} ${voice.speaking || waiting ? "animate-pulse" : ""}`}
                  title={aiEnabled ? "AI online" : "Offline mode"}
                />
              </div>
              <p className="min-h-10 text-sm text-ink-soft xl:min-h-0" aria-live="polite">
                {status}
              </p>
            </div>
          </div>
          <div className="relative mt-3 flex flex-wrap items-center gap-2 xl:justify-center">
            <label className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1 pl-3 pr-1 text-sm">
              <Icon name="chat" className="h-4 w-4 text-ink-soft" />
              <span className="sr-only">{t("tutor.language")}</span>
              <select
                id="tutor-language"
                value={language.code}
                onChange={(e) => changeLanguage(e.target.value as Locale)}
                className="rounded-md bg-transparent py-0.5 pr-1 outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                    {l.label !== l.english ? ` · ${l.english}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={toggleSpeak} role="switch" aria-checked={speakReplies} className="press flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm">
              <span className={`relative h-5 w-9 rounded-full transition ${speakReplies ? "bg-accent" : "bg-line-strong"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${speakReplies ? "left-4.5" : "left-0.5"}`} />
              </span>
              {t("tutor.speak")}
            </button>
            {voice.speaking && (
              <Button variant="ghost" className="px-3 py-1.5" onClick={voice.stop}>
                <Icon name="stop" className="h-4 w-4" /> Stop
              </Button>
            )}
            <Button variant="secondary" className="px-3 py-1.5" onClick={() => setCustomising(true)}>
              <Icon name="settings" className="h-4 w-4" /> {t("tutor.customise")}
            </Button>
            <Button variant="secondary" className="px-3 py-1.5 xl:hidden" onClick={() => setHistoryOpen(true)}>
              <Icon name="history" className="h-4 w-4" /> {t("tutor.history")}
            </Button>
          </div>
          {missingLanguage && (
            <p className="fade relative mt-3 rounded-xl bg-marker-soft px-3 py-2 text-xs">
              This browser has no {missingLanguage.english} voice, so {tutor.name} may sound off or stay silent. Microsoft Edge includes natural
              voices for most Indian languages; the written reply is always shown.
            </p>
          )}
        </Card>

        <Card className="hidden p-3 xl:block">
          <div className="mb-2 flex items-center justify-between px-2">
            <Label>{t("tutor.history")}</Label>
            <button onClick={newChat} className="press flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-accent hover:bg-accent-soft">
              <Icon name="plus" className="h-4 w-4" /> New
            </button>
          </div>
          <div className="no-scrollbar max-h-[26vh] overflow-y-auto">{sessionList}</div>
        </Card>
      </aside>

      <section className="flex min-w-0 flex-col gap-3">
        {!aiEnabled && (
          <p className="fade flex items-start gap-3 rounded-xl border border-marker-2/30 bg-marker-soft px-4 py-3 text-sm">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-marker" />
            <span>
              <strong>Offline mode.</strong> {tutor.name} reads out the worked solution but can&apos;t hold a conversation, reply in other languages or
              read photos until a free Gemini key is added to <code className="rounded bg-surface/70 px-1">apps/api/.env</code>.
            </span>
          </p>
        )}

        <Card className="flex flex-col overflow-hidden p-0 xl:h-[calc(100dvh-5rem)]">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium" dir="auto">
              {session ? session.title : t("tutor.newChat")}
            </p>
            {session && (
              <button onClick={newChat} className="press flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm text-accent hover:bg-accent-soft">
                <Icon name="plus" className="h-4 w-4" /> New
              </button>
            )}
          </div>

          {context && (
            <div className="flex items-start gap-3 border-b border-line bg-surface-2/50 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <Label>Question we&apos;re discussing</Label>
                <p className="mt-1 line-clamp-4 whitespace-pre-line" dir="auto">
                  {context}
                </p>
              </div>
              <Button variant="secondary" className="shrink-0 px-3 py-1.5" onClick={() => send(t("tutor.explainRequest"))} disabled={waiting}>
                <Icon name="speaker" className="h-4 w-4" /> <span className="hidden sm:inline">{t("tutor.explain")}</span>
              </Button>
            </div>
          )}

          <div ref={scroller} className="flex min-h-[320px] flex-1 flex-col gap-3 overflow-y-auto px-4 py-5">
            {(!session || session.messages.length === 0) && !waiting && (
              <div className="fade m-auto flex flex-col items-center gap-4 py-6 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-surface-2 text-accent">
                  <Icon name="sparkles" className="h-7 w-7" />
                </span>
                <div>
                  <p className="text-xl font-semibold tracking-tight">What shall we work on?</p>
                  <p className="text-sm text-ink-soft">
                    {tutor.name} explains out loud in {language.english}. Try one of these, or ask your own doubt.
                  </p>
                </div>
                <div className="flex max-w-xl flex-wrap justify-center gap-2">
                  {["What's the shortcut for combined work problems?", "How do I solve syllogisms with 'some'?", "Why is average speed not (x + y) / 2?"].map((s, i) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{ "--i": i } as CSSProperties}
                      className="pop press rounded-lg border border-line bg-surface px-3.5 py-2 text-sm hover:border-line-strong hover:bg-surface-2"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {session?.messages.map((m) => {
              const live = voice.activeKey === m.id;
              return (
                <div key={m.id} className={`rise flex items-end gap-2 ${m.role === "student" ? "justify-end" : "justify-start"}`}>
                  {m.role === "tutor" && (
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${tutor.gender === "female" ? "bg-accent-soft text-accent" : "bg-marker-soft text-marker"} ${live ? "ring-4 ring-accent/25" : ""}`}
                    >
                      {tutor.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div
                    dir="auto"
                    className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                      m.role === "student" ? "whitespace-pre-line rounded-br-sm bg-primary text-primary-ink" : "rounded-bl-sm border border-line bg-surface"
                    } ${live ? "border-accent/40" : ""}`}
                  >
                    {m.role === "tutor" ? <SpokenText text={m.content} active={live ? voice.sentence : -1} /> : m.content}
                    {m.role === "tutor" && (
                      <button
                        onClick={() => (live ? voice.stop() : voice.say(m.content, m.id))}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-accent"
                        aria-label={live ? "Stop reading this reply" : "Read this reply aloud"}
                      >
                        <Icon name={live ? "stop" : "speaker"} className="h-3.5 w-3.5" /> {live ? "Stop" : "Listen"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {waiting && (
              <div className="fade flex items-end gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${tutor.gender === "female" ? "bg-accent-soft text-accent" : "bg-marker-soft text-marker"}`}>
                  {tutor.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-4" aria-label={`${tutor.name} is typing`}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="typing-dot h-2 w-2 rounded-full bg-accent" style={{ "--i": i } as CSSProperties} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-line bg-surface/80 p-3">
            <ErrorNote message={error ?? mic.error} />
            <form onSubmit={onSubmit} className={`flex items-end gap-2 ${error || mic.error ? "mt-3" : ""}`}>
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
                className="press grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line text-ink-soft hover:border-line-strong hover:text-ink disabled:opacity-50"
              >
                <Icon name="camera" />
              </button>
              <textarea
                id="tutor-draft"
                dir="auto"
                value={mic.listening ? mic.interim : draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                rows={1}
                placeholder={mic.listening ? listeningText : t("tutor.placeholder")}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              />
              {mic.supported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={mic.listening ? "Stop listening" : "Speak your question"}
                  title={mic.listening ? "Stop listening" : "Speak your question"}
                  className={`press relative grid h-11 w-11 shrink-0 place-items-center rounded-lg ${
                    mic.listening ? "bg-accent text-accent-ink" : "border border-line text-ink-soft hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {mic.listening && <span className="absolute inset-0 animate-ping rounded-lg bg-accent/30" />}
                  <Icon name={mic.listening ? "stop" : "mic"} className="relative h-5 w-5" />
                </button>
              )}
              <Button type="submit" disabled={waiting || !draft.trim()} className="h-11 w-11 shrink-0 p-0 sm:w-auto sm:px-4" aria-label={t("tutor.send")}>
                <Icon name="send" className="h-4 w-4" />
                <span className="hidden sm:inline">{t("tutor.send")}</span>
              </Button>
            </form>
            {!mic.supported && <p className="mt-2 text-xs text-ink-soft">Voice input works in Chrome and Edge.</p>}
          </div>
        </Card>
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
