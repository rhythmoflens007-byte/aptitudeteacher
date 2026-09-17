"use client";

import { ReactNode, ViewTransition } from "react";

const CLASSES = { "nav-forward": "page-forward", "nav-back": "page-back", default: "page-fade" };

/**
 * Wraps a page's content so route changes play a cinematic transition:
 * a directional slide for tagged links, otherwise a soft blur-and-rise.
 * Must live inside each page (not a layout) so it mounts and unmounts per route.
 */
export default function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <ViewTransition enter={CLASSES} exit={CLASSES} default="none">
      <div className={className}>{children}</div>
    </ViewTransition>
  );
}
