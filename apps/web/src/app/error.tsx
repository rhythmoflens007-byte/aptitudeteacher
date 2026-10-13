"use client";

import Link from "next/link";
import { useEffect } from "react";
import TutorAvatar from "@/components/TutorAvatar";
import { Blobs, Button, buttonClass, Icon } from "@/components/ui";
import { useT } from "@/lib/i18n";

/** Shown when a page crashes: a calm explanation and two ways forward, never a blank screen. */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <Blobs />
      <div className="relative flex max-w-md flex-col items-center gap-6 rounded-[36px] bg-surface p-8 text-center shadow-[var(--shadow-lg)] ring-1 ring-hairline sm:p-10">
        <div className="h-36 w-36 overflow-hidden rounded-full bg-gradient-to-b from-coral-soft to-surface">
          <TutorAvatar gender="female" mood="concerned" framing="portrait" stage={false} className="h-full w-full" />
        </div>
        <div>
          <h1 className="font-display text-3xl">{t("crash.title")}</h1>
          <p className="mt-2 text-ink-soft">{t("crash.text")}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="spark" onClick={() => retry()}>
            <Icon name="refresh" className="h-4 w-4" /> {t("error.retry")}
          </Button>
          <Link href="/dashboard" className={buttonClass("secondary")}>
            {t("crash.home")}
          </Link>
        </div>
        {error.digest && <p className="font-mono text-[11px] text-ink-faint">ref {error.digest}</p>}
      </div>
    </main>
  );
}
