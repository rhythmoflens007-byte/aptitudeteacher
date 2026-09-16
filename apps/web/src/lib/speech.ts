"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

export function useSpeechRecognition(lang: string) {
  const supported = useSyncExternalStore(noopSubscribe, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => () => recRef.current?.abort(), []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = recognitionCtor();
      if (!Ctor) return;
      recRef.current?.abort();
      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      let finalText = "";
      rec.onresult = (e) => {
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else live += result[0].transcript;
        }
        setInterim(finalText + live);
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed") setError("Microphone access is blocked. Allow it in your browser's site settings.");
        else if (e.error !== "no-speech" && e.error !== "aborted") setError(`Voice input stopped (${e.error}).`);
      };
      rec.onend = () => {
        setListening(false);
        setInterim("");
        if (finalText.trim()) onFinal(finalText.trim());
      };
      setError(null);
      setListening(true);
      rec.start();
      recRef.current = rec;
    },
    [lang],
  );

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported, listening, interim, error, start, stop };
}

export type Viseme = "rest" | "open" | "wide" | "round";

export function visemeFor(word: string): Viseme {
  const w = word.toLowerCase();
  if (/[ouौोूु]|ொ|ோ|ு|ூ/.test(w)) return "round";
  if (/[eiेीि]|ெ|ே|ி|ீ/.test(w)) return "wide";
  if (/[a-zA-Zऀ-ॿ஀-௿]/.test(w)) return "open";
  return "rest";
}

export function cleanForSpeech(text: string) {
  return text
    .replace(/[*_#`>|]/g, "")
    .replace(/√/g, " root ")
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/₹/g, " rupees ");
}

export function speak(
  text: string,
  lang: string,
  handlers: { onStart?: () => void; onEnd?: () => void; onWord?: (word: string) => void },
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const spoken = cleanForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = lang;
  const prefix = lang.split("-")[0];
  const voices = synth.getVoices();
  utterance.voice =
    voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(prefix)) ?? null;
  utterance.rate = 1;
  utterance.onstart = () => handlers.onStart?.();
  utterance.onend = () => handlers.onEnd?.();
  utterance.onerror = () => handlers.onEnd?.();
  utterance.onboundary = (e) => {
    if (e.name !== "word") return;
    const rest = spoken.slice(e.charIndex);
    handlers.onWord?.(rest.split(/\s/, 1)[0] ?? "");
  };
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
