"use client";

import type { Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, setGuestLocale, useT } from "@/lib/i18n";
import { Icon } from "./ui";

/** Compact language switcher. Guests' choice is remembered on this device; signed-in users' is saved to their profile. */
export default function LanguageMenu({ className = "" }: { className?: string }) {
  const { user, updateProfile } = useAuth();
  const { t, locale } = useT();

  function choose(code: Locale) {
    if (user) void updateProfile({ locale: code }).catch(() => {});
    setGuestLocale(code);
  }

  return (
    <label className={`press relative flex h-9 items-center gap-1.5 rounded-full pl-2.5 pr-2 text-sm font-medium text-ink-soft hover:bg-surface-2 hover:text-ink ${className}`}>
      <Icon name="language" className="h-[18px] w-[18px] shrink-0" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale}
        onChange={(e) => choose(e.target.value as Locale)}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-semibold text-ink outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
