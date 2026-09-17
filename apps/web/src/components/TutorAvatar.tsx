"use client";

import type { TutorGender } from "@/lib/tutor";
import type { Mood } from "@/lib/tutorRig";
import TutorFigure, { Framing } from "./TutorFigure";

export type { Mood } from "@/lib/tutorRig";
export type { Framing } from "./TutorFigure";

export type TutorVoiceState = {
  speaking: boolean;
  word: string;
  wordTick: number;
  gestureTick: number;
  sentenceText: string;
  emotion: string | null;
};

export type TutorAvatarProps = {
  gender: TutorGender;
  /** Pass the whole `useTutorVoice()` result to make the tutor act out what it says. */
  voice?: TutorVoiceState;
  mood?: Mood;
  framing?: Framing;
  className?: string;
  stage?: boolean;
};

/** The animated 2D tutor on an optional soft stage. */
export default function TutorAvatar({ gender, voice, mood = "neutral", framing = "portrait", className = "", stage = true }: TutorAvatarProps) {
  const speaking = voice?.speaking ?? false;
  return (
    <div className={`relative isolate ${className}`}>
      {stage && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <span className="tutor-stage-glow" />
          {framing === "full" && <span className={`tutor-stage-ring ${speaking ? "tutor-stage-ring--live" : ""}`} />}
        </div>
      )}
      <TutorFigure
        key={gender}
        gender={gender}
        speaking={speaking}
        mood={mood}
        word={voice?.word ?? ""}
        wordTick={voice?.wordTick ?? 0}
        sentence={voice?.sentenceText ?? ""}
        sentenceTick={voice?.gestureTick ?? 0}
        emotion={voice?.emotion ?? null}
        framing={framing}
        className="fade"
      />
    </div>
  );
}
