"use client";

import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useEffect } from "react";
import { Icon } from "./ui";

export default function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title} data-lenis-prevent>
          <motion.button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-ink/25 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
          <motion.div
            className="relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-[32px] bg-surface p-6 shadow-[var(--shadow-lg)] sm:rounded-[32px] sm:p-8"
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="press grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-ink-soft hover:text-ink">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
