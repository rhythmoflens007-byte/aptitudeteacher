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

// Rounded and spread vowels across Latin, Indic and Arabic scripts, used to pick a mouth shape per word.
const ROUND = /[ouOUोूुোূুொோுூొోుూೊೋುೂൊോുൂોૂુੋੂੁوُ]/;
const SPREAD = /[eiEIेीिেীিெேிீెేిీೆೇಿೀെേിീેીિੇੀਿيِ]/;

export function visemeFor(word: string): Viseme {
  if (ROUND.test(word)) return "round";
  if (SPREAD.test(word)) return "wide";
  if (/\p{L}/u.test(word)) return "open";
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

/** Lines of sentences. Flattened, the order matches what speak() says, so callers can highlight the current sentence. */
export function sentenceLines(text: string): string[][] {
  return text.split("\n").map((line) => {
    const parts = line.split(/(?<=[.!?।॥؟])\s+/).map((part) => part.trim()).filter(Boolean);
    const merged: string[] = [];
    for (const part of parts) {
      // Keep step numbers like "1." attached to their step.
      if (merged.length && /^\d+[.)]$/.test(merged[merged.length - 1])) merged[merged.length - 1] += ` ${part}`;
      else merged.push(part);
    }
    return merged;
  });
}

const SCRIPTS: [RegExp, string][] = [
  [/[ऀ-ॿ]/g, "hi-IN"],
  [/[஀-௿]/g, "ta-IN"],
  [/[ఀ-౿]/g, "te-IN"],
  [/[A-Za-z]/g, "en-IN"],
];

/** Picks the voice language from the script the reply is actually written in, since the tutor may answer in the student's language. */
export function detectSpeechLang(text: string, preferred: string): string {
  let best = "";
  let bestCount = 0;
  for (const [pattern, lang] of SCRIPTS) {
    const count = text.match(pattern)?.length ?? 0;
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  return best || preferred;
}

// Browsers don't expose a voice's gender, so infer it from well-known system voice names.
const FEMALE_VOICE =
  /female|woman|heera|kalpana|swara|neerja|pallavi|zira|aria|jenny|samantha|veena|lekha|sonia|libby|natasha|salli|joanna|kajal|aditi|raveena|shruti|sapna|ananya|karen|moira|tessa|fiona|victoria|sobhana|aarohi|tanishaa|dhwani|gul|zariyah|elvira|denise|vivienne|salma|vaani|kavya|swati|paulina|monica|amelie|hoda/i;
const MALE_VOICE =
  /(?<!fe)male|\bman\b|ravi|hemant|madhur|prabhat|valluvar|mark|david|guy|ryan|daniel|rishi|george|james|fred|alex|tom|aaron|arthur|thomas|kumar|mohan|gagan|midhun|manohar|bashkar|niranjan|salman|hamed|alvaro|henri|remy|jorge|pablo|naayf|asad|ojas/i;

function synth() {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

function voicesReady(): Promise<void> {
  const s = synth();
  if (!s || s.getVoices().length) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      s.removeEventListener("voiceschanged", done);
      resolve();
    };
    s.addEventListener("voiceschanged", done);
    setTimeout(done, 1200);
  });
}

function voicesFor(lang: string) {
  const prefix = lang.split("-")[0];
  const voices = synth()?.getVoices() ?? [];
  return [...voices.filter((v) => v.lang.replace("_", "-") === lang), ...voices.filter((v) => v.lang.replace("_", "-") !== lang && v.lang.startsWith(prefix))];
}

export async function hasVoiceFor(lang: string) {
  await voicesReady();
  return voicesFor(lang).length > 0;
}

export function pickVoice(lang: string, gender: "female" | "male") {
  const inLanguage = voicesFor(lang);
  const wanted = gender === "female" ? FEMALE_VOICE : MALE_VOICE;
  const unwanted = gender === "female" ? MALE_VOICE : FEMALE_VOICE;
  const match = inLanguage.find((v) => wanted.test(v.name) && !(gender === "male" && FEMALE_VOICE.test(v.name)));
  if (match) return { voice: match, pitch: 1 };
  // No voice of the right gender installed: shift the pitch of whatever voice is available instead.
  const neutral = inLanguage.find((v) => !unwanted.test(v.name)) ?? inLanguage[0] ?? null;
  return { voice: neutral, pitch: gender === "female" ? 1.15 : 0.8 };
}

export type SpeechHandlers = {
  onStart?: () => void;
  onEnd?: () => void;
  onWord?: (word: string) => void;
  onSentence?: (index: number) => void;
};

let generation = 0;

/**
 * Speaks text one sentence at a time. Chrome silently stops a single long utterance after about
 * 15 seconds, and per-sentence events let the avatar change gesture and the UI highlight the sentence.
 */
export async function speak(text: string, lang: string, handlers: SpeechHandlers, gender: "female" | "male" = "female") {
  const s = synth();
  if (!s) return;
  const run = ++generation;
  s.cancel();
  await voicesReady();
  if (run !== generation) return;

  const sentences = sentenceLines(text).flat();
  if (!sentences.length) return;
  const { voice, pitch } = pickVoice(lang, gender);
  let started = false;
  sentences.forEach((sentence, index) => {
    const spoken = cleanForSpeech(sentence);
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = lang;
    utterance.voice = voice;
    utterance.pitch = pitch;
    utterance.rate = 1;
    const last = index === sentences.length - 1;
    utterance.onstart = () => {
      if (run !== generation) return;
      if (!started) {
        started = true;
        handlers.onStart?.();
      }
      handlers.onSentence?.(index);
    };
    utterance.onboundary = (e) => {
      if (run !== generation || e.name !== "word") return;
      handlers.onWord?.(spoken.slice(e.charIndex).split(/\s/, 1)[0] ?? "");
    };
    utterance.onend = () => {
      if (run === generation && last) handlers.onEnd?.();
    };
    utterance.onerror = () => {
      if (run === generation && last) handlers.onEnd?.();
    };
    s.speak(utterance);
  });
}

export function stopSpeaking() {
  generation++;
  synth()?.cancel();
}
