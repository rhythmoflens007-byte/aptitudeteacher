"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Avatar, { Mood } from "@/components/Avatar";
import { Button, Card, ErrorNote, Label } from "@/components/ui";
import { api, TutorMessage, TutorSession } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { speak, stopSpeaking, useSpeechRecognition, Viseme, visemeFor } from "@/lib/speech";

const SPEAK_PREF = "aptitude.tutor.speak";

type SessionSummary = Omit<TutorSession, "messages">;

export default function TutorPage() {
  return (
    <AppShell wide>
      <Tutor />
    </AppShell>
  );
}

function Tutor() {
  const { t, speechLang } = useT();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [session, setSession] = useState<TutorSession | null>(null);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  // Tutor only renders client-side (AppShell waits for auth), so reading storage here is safe.
  const [speakReplies, setSpeakReplies] = useState(() => {
    try {
      return localStorage.getItem(SPEAK_PREF) !== "off";
    } catch {
      return true;
    }
  });

  const [speaking, setSpeaking] = useState(false);
  const [viseme, setViseme] = useState<Viseme>("rest");
  const [wordTick, setWordTick] = useState(0);

  const voice = useSpeechRecognition(speechLang);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const refreshSessions = useCallback(() => {
    api<SessionSummary[]>("/tutor/sessions").then(setSessions).catch(() => {});
  }, []);

  const openSession = useCallback(async (id: string) => {
    stopSpeaking();
    try {
      setSession(await api<TutorSession>(`/tutor/sessions/${id}`));
      setError(null);
      window.history.replaceState(null, "", `/tutor?session=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that conversation.");
    }
  }, []);

  useEffect(() => {
    api<{ ai_enabled: boolean }>("/tutor/status").then((s) => setAiEnabled(s.ai_enabled)).catch(() => {});
    refreshSessions();
    const id = new URLSearchParams(window.location.search).get("session");
    if (id)
      api<TutorSession>(`/tutor/sessions/${id}`)
        .then(setSession)
        .catch((e) => setError(e.message));
    return () => stopSpeaking();
  }, [refreshSessions]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session?.messages.length, waiting]);

  function toggleSpeak() {
    const next = !speakReplies;
    setSpeakReplies(next);
    if (!next) stopSpeaking();
    try {
      localStorage.setItem(SPEAK_PREF, next ? "on" : "off");
    } catch {}
  }

  const say = useCallback(
    (text: string) => {
      speak(text, speechLang, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onWord: (w) => {
          setViseme(visemeFor(w));
          setWordTick((n) => n + 1);
        },
      });
    },
    [speechLang],
  );

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || waiting) return;
      stopSpeaking();
      setSpeaking(false);
      setError(null);
      setDraft("");
      setWaiting(true);
      try {
        let active = session;
        if (!active) {
          active = await api<TutorSession>("/tutor/sessions", { method: "POST", json: {} });
          window.history.replaceState(null, "", `/tutor?session=${active.id}`);
        }
        const pending: TutorMessage = { id: `local-${Date.now()}`, role: "student", content: text, created_at: new Date().toISOString() };
        setSession({ ...active, messages: [...active.messages, pending] });
        const reply = await api<TutorMessage>(`/tutor/sessions/${active.id}/messages`, { method: "POST", json: { content: text } });
        setSession((s) => (s ? { ...s, messages: [...s.messages, reply] } : s));
        if (speakReplies) say(reply.content);
        refreshSessions();
      } catch (e) {
        setDraft(text);
        setError(e instanceof Error ? e.message : "Message didn't send.");
      } finally {
        setWaiting(false);
      }
    },
    [refreshSessions, say, session, speakReplies, waiting],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  function toggleMic() {
    if (voice.listening) {
      voice.stop();
      return;
    }
    stopSpeaking();
    setSpeaking(false);
    voice.start((text) => send(text));
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
      setDraft("Can you explain how to solve this?");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that photo.");
    } finally {
      setWaiting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const mood: Mood = voice.listening ? "listening" : waiting ? "thinking" : speaking ? "neutral" : "happy";
  const context = session?.question_text ?? (session?.question_id ? session.title : null);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <aside className="order-2 lg:order-1">
        <Card className="p-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              stopSpeaking();
              setSession(null);
              window.history.replaceState(null, "", "/tutor");
            }}
          >
            + {t("tutor.newChat")}
          </Button>
          <ul className="mt-3 flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => openSession(s.id)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm ${
                    session?.id === s.id ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <span className="line-clamp-2">{s.title}</span>
                  <span className="text-[11px] opacity-70">{new Date(s.started_at).toLocaleDateString()}</span>
                </button>
              </li>
            ))}
            {sessions.length === 0 && <li className="px-2 py-2 text-xs text-ink-soft">No conversations yet.</li>}
          </ul>
        </Card>
      </aside>

      <section className="order-1 flex min-w-0 flex-col gap-4 lg:order-2">
        {!aiEnabled && (
          <p className="rounded-lg border border-marker/40 bg-marker-soft px-4 py-3 text-sm">
            <strong>Offline mode.</strong> Asha can show worked solutions but can&apos;t hold a conversation or read photos until a free
            Gemini key is added to <code>apps/api/.env</code>.
          </p>
        )}

        <Card className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <Avatar speaking={speaking} viseme={viseme} wordTick={wordTick} mood={mood} size={150} />
          <div className="flex flex-1 flex-col gap-2">
            <h1 className="font-display text-2xl font-semibold">{t("tutor.title")} · Asha</h1>
            <p className="text-sm text-ink-soft" aria-live="polite">
              {voice.listening
                ? voice.interim || t("tutor.listening")
                : waiting
                  ? "Thinking…"
                  : speaking
                    ? "Speaking. Tap the mic to interrupt."
                    : "Ask by typing, speaking, or sending a photo of a question."}
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm">
                <input id="speak-replies" type="checkbox" checked={speakReplies} onChange={toggleSpeak} className="accent-[var(--accent)]" />
                {t("tutor.speak")}
              </label>
              {speaking && (
                <Button variant="ghost" className="px-3 py-1.5" onClick={() => { stopSpeaking(); setSpeaking(false); }}>
                  ■ Stop
                </Button>
              )}
            </div>
          </div>
        </Card>

        {context && (
          <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
            <Label>Question we&apos;re discussing</Label>
            <p className="mt-1 whitespace-pre-line">{context}</p>
          </div>
        )}

        <Card className="flex min-h-[320px] flex-col gap-3 p-4">
          {(!session || session.messages.length === 0) && !waiting && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center text-sm text-ink-soft">
              <p>Try asking:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "What's the shortcut for combined work problems?",
                  "How do I solve syllogisms with 'some'?",
                  "Why is average speed not (x + y) / 2?",
                ].map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-ink hover:border-accent">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {session?.messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "student" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 leading-relaxed ${
                  m.role === "student" ? "rounded-br-sm bg-accent text-accent-ink" : "rounded-bl-sm bg-surface-2"
                }`}
              >
                {m.content}
                {m.role === "tutor" && (
                  <button onClick={() => say(m.content)} className="mt-1 block text-xs text-ink-soft hover:text-accent" aria-label="Read this reply aloud">
                    🔊 Listen
                  </button>
                )}
              </div>
            </div>
          ))}
          {waiting && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-3 text-ink-soft">
                <span className="animate-pulse">Asha is thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottom} />
        </Card>

        <ErrorNote message={error ?? voice.error} />

        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <input
            ref={fileInput}
            id="photo-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
          />
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={waiting} aria-label={t("tutor.photo")} title={t("tutor.photo")}>
            📷
          </Button>
          <textarea
            id="tutor-draft"
            value={voice.listening ? voice.interim : draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            placeholder={t("tutor.placeholder")}
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          {voice.supported && (
            <Button
              type="button"
              variant={voice.listening ? "marker" : "secondary"}
              onClick={toggleMic}
              aria-label={voice.listening ? "Stop listening" : "Speak your question"}
              title={voice.listening ? "Stop listening" : "Speak your question"}
            >
              {voice.listening ? "■" : "🎤"}
            </Button>
          )}
          <Button type="submit" disabled={waiting || !draft.trim()}>
            {t("tutor.send")}
          </Button>
        </form>
        {!voice.supported && <p className="text-xs text-ink-soft">Voice input works in Chrome and Edge.</p>}
      </section>
    </div>
  );
}
