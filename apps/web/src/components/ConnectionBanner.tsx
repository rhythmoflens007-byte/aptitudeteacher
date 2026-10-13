"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { checkConnection, getConnection, getRecoveredAt, subscribeConnection } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Icon } from "./ui";

const RETRY_EVERY_MS = 4000;

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** Tells people when the app can't reach the internet or its server, and recovers on its own. */
export default function ConnectionBanner() {
  const { t } = useT();
  const connection = useSyncExternalStore(subscribeConnection, getConnection, () => "ok" as const);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const recoveredAt = useSyncExternalStore(subscribeConnection, getRecoveredAt, () => 0);
  const [dismissedRecovery, setDismissedRecovery] = useState(0);
  const [checking, setChecking] = useState(false);
  const down = connection === "down" || !online;

  useEffect(() => {
    if (!down) return;
    const id = setInterval(() => void checkConnection(), RETRY_EVERY_MS);
    return () => clearInterval(id);
  }, [down]);

  // Coming back online: confirm the server is reachable too.
  useEffect(() => {
    if (online) void checkConnection();
  }, [online]);

  useEffect(() => {
    if (!recoveredAt) return;
    const id = setTimeout(() => setDismissedRecovery(recoveredAt), 2600);
    return () => clearTimeout(id);
  }, [recoveredAt]);

  const showRecovered = !down && recoveredAt > 0 && dismissedRecovery !== recoveredAt;

  async function retry() {
    setChecking(true);
    await checkConnection();
    setChecking(false);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-3" role="status" aria-live="polite">
      <AnimatePresence>
        {down ? (
          <motion.div
            key="down"
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="glass pointer-events-auto flex max-w-lg items-center gap-3 rounded-full py-2 pl-2 pr-2 shadow-[var(--shadow-lg)] ring-1 ring-hairline"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral-soft text-coral-600">
              <Icon name="wifiOff" className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 text-sm">
              <span className="block font-semibold">{online ? t("conn.serverTitle") : t("conn.offlineTitle")}</span>
              <span className="block text-xs text-ink-soft">{t("conn.retrying")}</span>
            </span>
            <button onClick={retry} disabled={checking} className="press ml-1 flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-xs font-semibold shadow-[var(--shadow-xs)] disabled:opacity-60">
              <Icon name="refresh" className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
              {t("conn.retry")}
            </button>
          </motion.div>
        ) : showRecovered ? (
          <motion.div
            key="up"
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="glass flex items-center gap-2 rounded-full py-2 pl-2 pr-4 shadow-[var(--shadow-lg)] ring-1 ring-hairline"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-success-soft text-success">
              <Icon name="check" className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">{t("conn.back")}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
