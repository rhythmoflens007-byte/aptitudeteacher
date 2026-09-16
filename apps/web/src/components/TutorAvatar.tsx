"use client";

import dynamic from "next/dynamic";
import { Component, ReactNode, useSyncExternalStore } from "react";
import type { Viseme } from "@/lib/speech";
import type { TutorGender } from "@/lib/tutor";
import Avatar, { Mood } from "./Avatar";

const Tutor3D = dynamic(() => import("./Tutor3D"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-full bg-accent/10" />,
});

export type TutorAvatarProps = {
  gender: TutorGender;
  speaking?: boolean;
  viseme?: Viseme;
  wordTick?: number;
  mood?: Mood;
  className?: string;
  stage?: boolean;
};

let webglSupport: boolean | null = null;
function detectWebGL() {
  if (webglSupport === null) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noopSubscribe = () => () => {};

class RenderGuard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function TutorAvatar({
  gender,
  speaking = false,
  viseme = "rest",
  wordTick = 0,
  mood = "happy",
  className = "",
  stage = true,
}: TutorAvatarProps) {
  const webgl = useSyncExternalStore(noopSubscribe, detectWebGL, () => true);
  const flat = (
    <div className="flex h-full w-full items-end justify-center">
      <Avatar gender={gender} speaking={speaking} viseme={viseme} wordTick={wordTick} mood={mood} size={220} />
    </div>
  );

  return (
    <div className={`relative isolate ${className}`}>
      {stage && (
        <div aria-hidden className="tutor-stage pointer-events-none absolute inset-0 -z-10">
          <span className="tutor-stage-glow" />
          <span className={`tutor-stage-ring ${speaking ? "tutor-stage-ring--live" : ""}`} />
        </div>
      )}
      {webgl ? (
        <RenderGuard fallback={flat}>
          <Tutor3D gender={gender} speaking={speaking} viseme={viseme} wordTick={wordTick} mood={mood} />
        </RenderGuard>
      ) : (
        flat
      )}
    </div>
  );
}
