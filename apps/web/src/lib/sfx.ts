"use client";

/** Small lesson sounds, synthesised on the fly (no audio files to download). Muting is remembered. */

const KEY = "aptitude.sounds";
let ctx: AudioContext | null = null;

export function soundsOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSounds(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* only the preference is lost */
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", volume = 0.12) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function play(kind: "correct" | "wrong" | "complete") {
  if (!soundsOn()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    if (kind === "correct") {
      tone(659.25, 0, 0.16);
      tone(987.77, 0.09, 0.26);
    } else if (kind === "wrong") {
      tone(196, 0, 0.22, "triangle", 0.1);
      tone(155.56, 0.12, 0.3, "triangle", 0.1);
    } else {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.35, "sine", 0.1));
    }
  } catch {
    /* no audio on this device */
  }
}
