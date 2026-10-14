"use client";

import { useSyncExternalStore } from "react";

/** Chrome's install event; not in TypeScript's DOM types yet. */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export type InstallState = "installed" | "ready" | "ios" | "unsupported";

let deferred: InstallPrompt | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  window.addEventListener("beforeinstallprompt", (e) => {
    // Keep Chrome's mini-infobar quiet; we offer installing from Profile instead.
    e.preventDefault();
    deferred = e as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

function snapshot(): InstallState {
  if (installed) return "installed";
  if (deferred) return "ready";
  // iPhone and iPad Safari can't be prompted; they install from the Share menu.
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
  return "unsupported";
}

/** Whether the app can be installed here, and a function that opens the browser's install dialog. */
export function useInstall(): { state: InstallState; install: () => Promise<boolean> } {
  const state = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    snapshot,
    () => "unsupported" as InstallState,
  );
  const install = async () => {
    if (!deferred) return false;
    const prompt = deferred;
    deferred = null;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    notify();
    return outcome === "accepted";
  };
  return { state, install };
}

/** Registers the service worker in production builds only: in development it would cache hot reloads. */
export function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
