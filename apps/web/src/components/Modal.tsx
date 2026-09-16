"use client";

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

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" onClick={onClose} className="fade absolute inset-0 bg-ink/40 backdrop-blur-sm" />
      <div className="rise relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-[var(--shadow-lg)] sm:rounded-3xl sm:p-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="press rounded-full p-2 text-ink-soft hover:bg-surface-2 hover:text-ink">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
