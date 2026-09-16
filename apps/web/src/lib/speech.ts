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

// Browsers don't expose a voice's gender, so infer it from well-known system voice names.
const FEMALE_VOICE = /female|woman|heera|kalpana|swara|neerja|pallavi|zira|aria|jenny|samantha|veena|lekha|sonia|libby|natasha|salli|joanna|kajal|aditi|raveena|shruti|sapna|ananya|karen|moira|tessa|fiona|victoria/i;
const MALE_VOICE = /(?<!fe)male|\bman\b|ravi|hemant|madhur|prabhat|valluvar|mark|david|guy|ryan|daniel|rishi|george|james|fred|alex|tom|aaron|arthur|thomas|kumar|mohan/i;

export function pickVoice(lang: string, gender: "female" | "male") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return { voice: null, pitch: 1 };
  const prefix = lang.split("-")[0];
  const voices = window.speechSynthesis.getVoices();
  const inLanguage = [...voices.filter((v) => v.lang === lang), ...voices.filter((v) => v.lang !== lang && v.lang.startsWith(prefix))];
  const wanted = gender === "female" ? FEMALE_VOICE : MALE_VOICE;
  const unwanted = gender === "female" ? MALE_VOICE : FEMALE_VOICE;
  const match = inLanguage.find((v) => wanted.test(v.name) && !(gender === "male" && FEMALE_VOICE.test(v.name)));
  if (match) return { voice: match, pitch: 1 };
  // No matching voice installed: shift the pitch of whatever voice is available instead.
  const neutral = inLanguage.find((v) => !unwanted.test(v.name)) ?? inLanguage[0] ?? null;
  return { voice: neutral, pitch: gender === "female" ? 1.15 : 0.8 };
}

export function speak(
  text: string,
  lang: string,
  handlers: { onStart?: () => void; onEnd?: () => void; onWord?: (word: string) => void },
  gender: "female" | "male" = "female",
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const spoken = cleanForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = lang;
  const { voice, pitch } = pickVoice(lang, gender);
  utterance.voice = voice;
  utterance.pitch = pitch;
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
