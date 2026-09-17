"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { Icon } from "./ui";

type ToastTone = "iris" | "sun" | "lagoon" | "coral";
type Toast = { id: number; title: string; detail?: string; icon: string; tone: ToastTone };

const ToastContext = createContext<(toast: Omit<Toast, "id">) => void>(() => {});

const TONES: Record<ToastTone, string> = {
  iris: "bg-iris-soft text-iris",
  sun: "bg-sun-soft text-sun-600",
  lagoon: "bg-lagoon-soft text-lagoon-600",
  coral: "bg-coral-soft text-coral-600",
};

let nextId = 1;

/** Slide-in notifications for small wins (XP, badges, streaks). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.9, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, scale: 0.95, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="glass pointer-events-auto flex items-center gap-3 rounded-full py-2 pl-2 pr-5 shadow-[var(--shadow-lg)] ring-1 ring-black/[0.04]"
            >
              <span className={`grid h-9 w-9 place-items-center rounded-full ${TONES[t.tone]}`}>
                <Icon name={t.icon} className="h-[18px] w-[18px]" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{t.title}</span>
                {t.detail && <span className="block text-xs text-ink-soft">{t.detail}</span>}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
