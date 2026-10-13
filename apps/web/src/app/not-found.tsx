"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import TutorAvatar from "@/components/TutorAvatar";
import { Blobs, buttonClass, Icon } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useT();
  const { user } = useAuth();
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <Blobs />
      <div className="relative px-5 py-5 sm:px-8">
        <Logo href={user ? "/dashboard" : "/"} />
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 text-center">
        <p aria-hidden className="text-spark font-display text-[7rem] leading-none sm:text-[10rem]">
          404
        </p>
        <div className="-mt-10 h-32 w-32 overflow-hidden rounded-full bg-gradient-to-b from-iris-soft to-surface shadow-[var(--shadow-md)] ring-4 ring-surface">
          <TutorAvatar gender="female" mood="thinking" framing="portrait" stage={false} className="h-full w-full" />
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-3xl sm:text-4xl">{t("notFound.title")}</h1>
          <p className="mt-2 text-ink-soft">{t("notFound.text")}</p>
        </div>
        <Link href={user ? "/dashboard" : "/"} className={buttonClass("spark", "px-6 py-3")}>
          {user ? t("crash.home") : t("notFound.home")} <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
