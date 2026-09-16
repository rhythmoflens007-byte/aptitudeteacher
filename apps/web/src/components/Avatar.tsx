"use client";

import { useEffect, useRef, useState } from "react";
import type { Viseme } from "@/lib/speech";

export type Mood = "neutral" | "happy" | "thinking" | "listening" | "concerned";

type Props = {
  speaking: boolean;
  viseme: Viseme;
  wordTick: number;
  mood: Mood;
  size?: number;
  gender?: "female" | "male";
};

const MOUTHS: Record<Viseme, React.ReactNode> = {
  rest: null,
  open: (
    <g>
      <ellipse cx="100" cy="146" rx="9" ry="7.5" fill="#5b1f24" />
      <ellipse cx="100" cy="150" rx="5.5" ry="2.8" fill="#d9707a" />
    </g>
  ),
  wide: (
    <g>
      <rect x="87" y="141.5" width="26" height="8" rx="4" fill="#5b1f24" />
      <rect x="90" y="142" width="20" height="3" rx="1.5" fill="#fff" />
    </g>
  ),
  round: <ellipse cx="100" cy="146" rx="5.5" ry="6.5" fill="#5b1f24" />,
};

export default function Avatar({ speaking, viseme, wordTick, mood, size = 220, gender = "female" }: Props) {
  const female = gender === "female";
  const [mouth, setMouth] = useState<Viseme>("rest");
  const [blink, setBlink] = useState(false);
  const word = useRef({ tick: wordTick, viseme });

  useEffect(() => {
    word.current = { tick: wordTick, viseme };
  }, [wordTick, viseme]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        schedule();
      }, 2600 + Math.random() * 2400);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Word-boundary events drive the mouth shape; some browser voices never fire them,
  // so fall back to a generic talking rhythm when no word has arrived recently.
  useEffect(() => {
    if (!speaking) return;
    const shapes: Viseme[] = ["open", "rest", "wide", "rest", "round", "open", "rest"];
    let seenTick = word.current.tick;
    let lastWordAt = 0;
    let frame = 0;
    const id = setInterval(() => {
      const now = performance.now();
      const latest = word.current;
      if (latest.tick !== seenTick) {
        seenTick = latest.tick;
        lastWordAt = now;
        setMouth(latest.viseme);
      } else if (now - lastWordAt < 450) {
        if (now - lastWordAt > 170) setMouth("rest");
      } else if (frame++ % 2 === 0) {
        setMouth(shapes[(frame >> 1) % shapes.length]);
      }
    }, 65);
    return () => clearInterval(id);
  }, [speaking]);

  const shownMouth = speaking ? mouth : "rest";

  const pupilY = mood === "thinking" ? -2.5 : 0;
  const pupilX = mood === "thinking" ? 2 : 0;
  const leftBrow = mood === "thinking" ? "M72 101 Q82 93 92 99" : mood === "concerned" ? "M72 99 Q82 97 92 101" : mood === "listening" ? "M72 99 Q82 92 92 98" : "M72 101 Q82 96 92 100";
  const rightBrow = mood === "concerned" ? "M108 101 Q118 97 128 99" : mood === "listening" ? "M108 98 Q118 92 128 99" : "M108 100 Q118 96 128 101";
  const smile =
    mood === "happy"
      ? "M86 142 Q100 156 114 142"
      : mood === "concerned"
        ? "M90 147 Q100 143 110 147"
        : mood === "thinking"
          ? "M92 145 Q102 147 110 142"
          : "M89 143 Q100 150 111 143";

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={size * 1.1}
      role="img"
      aria-label={speaking ? "Your tutor is speaking" : "Your tutor"}
      className={`max-w-full ${speaking ? "avatar-talking" : ""} ${mood === "listening" ? "avatar-tilt" : ""}`}
    >
      <g className="avatar-head">
        <path d="M30 220 Q34 176 100 170 Q166 176 170 220 Z" fill="var(--color-accent)" />
        <path d="M78 172 Q100 196 122 172 L118 168 Q100 180 82 168 Z" fill="#f3d1b5" />
        {female && <path d="M62 178 Q70 200 64 220 M138 178 Q130 200 136 220" stroke="var(--color-marker)" strokeWidth="5" fill="none" />}
        <rect x="90" y="150" width="20" height="24" rx="8" fill="#d9a07f" />
        {female && <path d="M46 110 Q40 40 100 36 Q160 40 154 110 Q156 150 140 160 L60 160 Q44 150 46 110 Z" fill="#2b1d1a" />}
        <ellipse cx="100" cy="118" rx="44" ry="50" fill="#e8b690" />
        <ellipse cx="56" cy="122" rx="7" ry="11" fill="#dea57d" />
        <ellipse cx="144" cy="122" rx="7" ry="11" fill="#dea57d" />
        {female && <circle cx="56" cy="134" r="2.6" fill="var(--color-marker)" />}
        {female && <circle cx="144" cy="134" r="2.6" fill="var(--color-marker)" />}
        {female ? (
          <>
            <path d="M56 104 Q60 58 100 60 Q134 60 146 100 Q120 78 92 76 Q70 80 56 104 Z" fill="#2b1d1a" />
            <circle cx="100" cy="92" r="2.6" fill="#b3263a" />
          </>
        ) : (
          <path d="M55 108 Q52 62 100 58 Q150 60 146 108 Q142 86 130 80 Q112 70 96 78 Q76 76 64 86 Q58 94 55 108 Z" fill="#2b1d1a" />
        )}
        <path d={leftBrow} stroke="#2b1d1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={rightBrow} stroke="#2b1d1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        {blink ? (
          <g stroke="#2b1d1a" strokeWidth="2.5" strokeLinecap="round">
            <path d="M74 114 Q82 118 90 114" fill="none" />
            <path d="M110 114 Q118 118 126 114" fill="none" />
          </g>
        ) : (
          <g>
            <ellipse cx="82" cy="114" rx="7" ry="6" fill="#fff" />
            <ellipse cx="118" cy="114" rx="7" ry="6" fill="#fff" />
            <circle cx={82 + pupilX} cy={114 + pupilY} r="3.6" fill="#2b1d1a" />
            <circle cx={118 + pupilX} cy={114 + pupilY} r="3.6" fill="#2b1d1a" />
            <circle cx={83 + pupilX} cy={112.5 + pupilY} r="1.1" fill="#fff" />
            <circle cx={119 + pupilX} cy={112.5 + pupilY} r="1.1" fill="#fff" />
          </g>
        )}
        <g stroke="#3b2a26" strokeWidth="2" fill="none">
          <rect x="70" y="104" width="24" height="20" rx="8" />
          <rect x="106" y="104" width="24" height="20" rx="8" />
          <path d="M94 112 Q100 108 106 112" />
        </g>
        <path d="M100 118 Q97 130 100 133 Q103 134 105 132" stroke="#c98c66" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="74" cy="134" rx="7" ry="4" fill="#e58f86" opacity={mood === "happy" ? 0.55 : 0.25} />
        <ellipse cx="126" cy="134" rx="7" ry="4" fill="#e58f86" opacity={mood === "happy" ? 0.55 : 0.25} />
        {shownMouth === "rest" ? (
          <path d={smile} stroke="#8a3a3f" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          MOUTHS[shownMouth]
        )}
      </g>
    </svg>
  );
}
