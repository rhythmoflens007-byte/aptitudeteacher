"use client";

import type { Viseme } from "@/lib/speech";
import type { TutorGender } from "@/lib/tutor";
import type { Mood } from "@/lib/tutorRig";
import TutorFigure, { Framing } from "./TutorFigure";

export type { Mood } from "@/lib/tutorRig";
export type { Framing } from "./TutorFigure";

export type TutorAvatarProps = {
  gender: TutorGender;
  speaking?: boolean;
  /** Kept for callers that still pass a coarse viseme; lip-sync now uses the spoken word itself. */
  viseme?: Viseme;
  word?: string;
  wordTick?: number;
  gestureTick?: number;
  mood?: Mood;
  framing?: Framing;
  className?: string;
  stage?: boolean;
};

/** The animated 2D tutor on an optional soft spotlight stage. */
export default function TutorAvatar({
  gender,
  speaking = false,
  word = "",
  wordTick = 0,
  gestureTick = 0,
  mood = "happy",
  framing = "portrait",
  className = "",
  stage = true,
}: TutorAvatarProps) {
  return (
    <div className={`relative isolate ${className}`}>
      {stage && (
        <div aria-hidden className="tutor-stage pointer-events-none absolute inset-0 -z-10">
          <span className="tutor-stage-glow" />
          {framing === "full" && <span className={`tutor-stage-ring ${speaking ? "tutor-stage-ring--live" : ""}`} />}
        </div>
      )}
      <TutorFigure key={gender} gender={gender} speaking={speaking} mood={mood} word={word} wordTick={wordTick} gestureTick={gestureTick} framing={framing} className="fade" />
    </div>
  );
}
