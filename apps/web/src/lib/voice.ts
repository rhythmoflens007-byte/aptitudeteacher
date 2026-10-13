"use client";

import { API_URL } from "./api";
import { cleanForSpeech, hasVoiceFor, pickVoice, sentenceLines } from "./speech";

export type Gender = "female" | "male";

export type SpeakerHandlers = {
  onStart?: () => void;
  onEnd?: () => void;
  onWord?: (word: string) => void;
  /** Index into the on-screen sentences (the same split `sentenceLines` makes). */
  onSentence?: (index: number) => void;
  /** Called when a sentence has to use the browser's voice and it has none for the language. */
  onMissingVoice?: (lang: string) => void;
};

type Word = { text: string; start: number; end: number };
type Clip = { url: string; words: Word[] };
type Item = { text: string; clip: Promise<Clip | null> | null };

const CLIP_CACHE = 160;
const clips = new Map<string, Promise<Clip | null>>();
let failures = 0;
let serverVoiceOffUntil = 0;

/** Neural voice for one sentence from the backend, or null to fall back to the browser's voice. */
function fetchClip(text: string, lang: string, gender: Gender): Promise<Clip | null> {
  if (Date.now() < serverVoiceOffUntil) return Promise.resolve(null);
  const key = `${gender}|${lang}|${text}`;
  const cached = clips.get(key);
  if (cached) return cached;
  const pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${API_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang, gender }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const data: { audio: string; words: Word[] } = await res.json();
      const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
      failures = 0;
      return { url: URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" })), words: data.words };
    } catch {
      // After repeated failures (offline, service down) stop waiting on it for a minute.
      if (++failures >= 2) serverVoiceOffUntil = Date.now() + 60_000;
      clips.delete(key);
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
  clips.set(key, pending);
  if (clips.size > CLIP_CACHE) {
    const [oldest, clip] = clips.entries().next().value!;
    clips.delete(oldest);
    clip.then((c) => c && URL.revokeObjectURL(c.url));
  }
  return pending;
}

let current: Speaker | null = null;

/** Makes `speaker` the only one talking. */
function claim(speaker: Speaker) {
  if (current !== speaker) current?.stop();
  current = speaker;
}

function release(speaker: Speaker) {
  if (current === speaker) current = null;
}

/**
 * Speaks sentences in order as they arrive, so streamed replies start talking at once.
 * Audio for upcoming sentences is fetched while earlier ones play, so there are no gaps.
 * Only one Speaker talks at a time across the app.
 */
export class Speaker {
  private items: Item[] = [];
  private index = 0;
  private closed = false;
  private stopped = false;
  private started = false;
  private wake: (() => void) | null = null;
  private finishPlayback: (() => void) | null = null;
  private audio: HTMLAudioElement | null = null;
  private frame = 0;

  constructor(
    private lang: string,
    private gender: Gender,
    private handlers: SpeakerHandlers,
  ) {
    claim(this);
    void this.run();
  }

  /** Adds text; it is split exactly like the on-screen sentences so highlights line up. */
  push(text: string) {
    for (const part of sentenceLines(text).flat()) {
      const spoken = cleanForSpeech(part).trim();
      const speakable = /[\p{L}\p{N}]/u.test(spoken);
      this.items.push({ text: spoken, clip: speakable ? fetchClip(spoken, this.lang, this.gender) : null });
    }
    this.wake?.();
  }

  /** No more text is coming; the speaker finishes what it has, then calls onEnd. */
  end() {
    this.closed = true;
    this.wake?.();
  }

  stop() {
    this.stopped = true;
    this.audio?.pause();
    cancelAnimationFrame(this.frame);
    window.speechSynthesis?.cancel();
    this.finishPlayback?.();
    this.wake?.();
    release(this);
  }

  private async run() {
    while (!this.stopped) {
      if (this.index >= this.items.length) {
        if (this.closed) break;
        await new Promise<void>((resolve) => (this.wake = resolve));
        this.wake = null;
        continue;
      }
      const at = this.index++;
      const item = this.items[at];
      const clip = item.clip ? await item.clip : null;
      if (this.stopped) return;
      if (!this.started) {
        this.started = true;
        this.handlers.onStart?.();
      }
      this.handlers.onSentence?.(at);
      if (!item.clip) continue;
      if (clip) await this.play(clip);
      else await this.speakWithBrowser(item.text);
    }
    if (!this.stopped) {
      release(this);
      this.handlers.onEnd?.();
    }
  }

  private play(clip: Clip) {
    return new Promise<void>((resolve) => {
      const audio = new Audio(clip.url);
      this.audio = audio;
      let next = 0;
      const tick = () => {
        const ms = audio.currentTime * 1000;
        while (next < clip.words.length && clip.words[next].start <= ms) this.handlers.onWord?.(clip.words[next++].text);
        this.frame = requestAnimationFrame(tick);
      };
      const done = () => {
        cancelAnimationFrame(this.frame);
        this.finishPlayback = null;
        this.audio = null;
        resolve();
      };
      this.finishPlayback = done;
      audio.onplaying = () => {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(tick);
      };
      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
  }

  private async speakWithBrowser(text: string) {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return;
    if (!(await hasVoiceFor(this.lang))) this.handlers.onMissingVoice?.(this.lang);
    if (this.stopped) return;
    const { voice, pitch } = pickVoice(this.lang, this.gender);
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.lang;
      utterance.voice = voice;
      utterance.pitch = pitch;
      utterance.onboundary = (e) => {
        if (e.name === "word") this.handlers.onWord?.(text.slice(e.charIndex).split(/\s/, 1)[0] ?? "");
      };
      const done = () => {
        this.finishPlayback = null;
        resolve();
      };
      utterance.onend = done;
      utterance.onerror = done;
      this.finishPlayback = done;
      synth.speak(utterance);
    });
  }
}

export function stopAllSpeech() {
  current?.stop();
}
