"use client";

import { MotionConfig } from "motion/react";
import { ReactNode } from "react";

/** Global motion defaults: honour the OS "reduce motion" setting and use one cinematic easing curve. */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </MotionConfig>
  );
}
