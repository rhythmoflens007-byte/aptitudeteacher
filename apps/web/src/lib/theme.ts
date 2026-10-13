"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

export type ThemePreference = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const KEY = "aptitude.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const META_COLOUR: Record<Theme, string> = { light: "#fbfaf7", dark: "#0c0c11" };

/** Runs in <head> before first paint so the page never flashes the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${KEY}")||"system";var d=p==="dark"||(p!=="light"&&matchMedia("${DARK_QUERY}").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function resolve(preference: ThemePreference): Theme {
  if (preference !== "system") return preference;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLOUR[theme]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (readPreference() === "system") apply(resolve("system"));
    listener();
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onSystemChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onSystemChange);
  };
}

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/**
 * Switches theme. With an origin (e.g. the toggle's centre) and view-transition support, the new
 * theme spreads out from that point; otherwise the colours cross-fade.
 */
export function setThemePreference(preference: ThemePreference, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  const commit = () => {
    try {
      if (preference === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, preference);
    } catch {}
    apply(resolve(preference));
    listeners.forEach((listener) => listener());
  };

  const next = resolve(preference);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };
  if (next === currentTheme() || reduce || !doc.startViewTransition) {
    root.classList.add("theme-fade");
    commit();
    window.setTimeout(() => root.classList.remove("theme-fade"), 400);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  root.style.setProperty("--reveal-x", `${x}px`);
  root.style.setProperty("--reveal-y", `${y}px`);
  root.style.setProperty("--reveal-r", `${radius}px`);
  root.classList.add("theme-reveal");
  const transition = doc.startViewTransition(() => flushSync(commit));
  transition.finished.finally(() => root.classList.remove("theme-reveal"));
}

/** The saved preference and the theme actually showing. */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as ThemePreference);
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);

  // In development React clears <html> attributes on its Strict Mode remount; put the theme back.
  useLayoutEffect(() => {
    apply(resolve(readPreference()));
  }, []);

  return { preference, theme, setPreference: setThemePreference };
}
