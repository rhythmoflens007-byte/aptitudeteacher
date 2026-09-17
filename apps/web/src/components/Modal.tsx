"use client";

import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useEffect } from "react";
import { Icon } from "./ui";

const EASE = [0.16, 1, 0.3, 1] as const;

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
            className="absolute inset-0 bg-navy/45 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
          <motion.div
            className="relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-[var(--shadow-lg)] sm:rounded-2xl sm:p-8"
            initial={{ opacity: 0, y: 40, scale: 0.97, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 24, scale: 0.98, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-line pb-4">
              <h2 className="font-display text-2xl">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="press rounded-md p-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink">
                <Icon name="x" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
