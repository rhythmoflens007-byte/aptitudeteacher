"use client";

import { motion } from "motion/react";
import { FormEvent, ReactNode, useState } from "react";
import AppShell from "@/components/AppShell";
import DailyReminder from "@/components/DailyReminder";
import { FadeIn } from "@/components/motion";
import { ThemePicker } from "@/components/ThemeToggle";
import TutorCustomizer from "@/components/TutorCustomizer";
import { Button, ErrorNote, Icon, PageHeader } from "@/components/ui";
import type { Locale } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, setGuestLocale, useT } from "@/lib/i18n";
import { useInstall } from "@/lib/install";

export default function ProfilePage() {
  return (
    <AppShell>
      <Profile />
    </AppShell>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <FadeIn className="flex flex-col gap-2">
      <h2 className="px-4 text-sm font-semibold text-ink-soft">{title}</h2>
      <div className="overflow-hidden rounded-[28px] bg-surface shadow-[var(--shadow-md)] ring-1 ring-hairline">{children}</div>
      {note && <p className="px-4 text-xs text-ink-soft">{note}</p>}
    </FadeIn>
  );
}

function InstallApp() {
  const { t } = useT();
  const { state, install } = useInstall();
  const toast = useToast();
  if (state === "unsupported") return null;
  return (
    <Group title={t("install.title")} note={t("install.note")}>
      <div className="flex items-center gap-4 px-6 py-4">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-iris-soft text-iris-600">
          <Icon name={state === "ios" ? "share" : "phone"} className="h-5 w-5" />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          {state === "installed" ? t("install.installed") : state === "ios" ? t("install.ios") : t("install.ready")}
        </p>
        {state === "installed" && <Icon name="check" className="h-5 w-5 shrink-0 text-success" />}
        {state === "ready" && (
          <Button variant="primary" className="shrink-0" onClick={async () => {
              if (await install()) toast({ title: t("install.done"), icon: "phone", tone: "lagoon" });
            }}>
            {t("install.button")}
          </Button>
        )}
      </div>
    </Group>
  );
}

function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const { t, errorText } = useT();
  const [name, setName] = useState(user?.display_name ?? "");
  const [locale, setLocale] = useState<Locale>(user?.locale ?? "en");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      await updateProfile({ display_name: name, locale });
      setGuestLocale(locale);
      setSaved(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const tones = ["bg-iris", "bg-coral", "bg-lagoon", "bg-sun"];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("profile.eyebrow")}
        title={
          <span className="flex items-center gap-4">
            <motion.span
              initial={{ scale: 0.6, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              aria-hidden
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-spark text-2xl font-bold text-white shadow-[var(--shadow-md)]"
            >
              {(user?.display_name.trim().charAt(0) || "?").toUpperCase()}
            </motion.span>
            <span className="min-w-0 truncate">{user?.display_name}</span>
          </span>
        }
        description={user?.email}
      />

      <Group title={t("tutor.yourTutor")} note={t("profile.tutorNote")}>
        <div className="p-6">
          <TutorCustomizer />
        </div>
      </Group>

      <Group title={t("theme.title")} note={t("theme.note")}>
        <ThemePicker />
      </Group>

      <InstallApp />

      <Group title={t("reminder.title")} note={t("reminder.note")}>
        <DailyReminder />
      </Group>

      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <Group title={t("profile.title")}>
          <label className="flex items-center gap-4 px-6 py-4">
            <span className="w-32 shrink-0 text-sm font-semibold">{t("profile.name")}</span>
            <input id="profile-name" className="min-w-0 flex-1 rounded-lg bg-transparent text-right text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-iris" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </label>
          <div className="mx-6 h-px bg-line" />
          <div className="flex items-center gap-4 px-6 py-4">
            <span className="w-32 shrink-0 text-sm font-semibold">{t("auth.email")}</span>
            <span className="min-w-0 flex-1 truncate text-right text-ink-soft">{user?.email}</span>
          </div>
        </Group>

        <Group title={t("profile.language")} note={t("profile.languageNote")}>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4" role="radiogroup" aria-label={t("profile.language")}>
            {LANGUAGES.map((l, i) => {
              const on = locale === l.code;
              return (
                <motion.button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  lang={l.code}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocale(l.code)}
                  className={`relative overflow-hidden rounded-3xl p-4 text-left transition-colors duration-300 ${on ? `${tones[i]} ${i >= 2 ? "text-coal" : "text-white"} shadow-[var(--shadow-md)]` : "bg-surface-2 text-ink"}`}
                >
                  <span className="block font-display text-2xl">{l.label}</span>
                  <span lang="en" className={`block text-xs ${on ? "opacity-80" : "text-ink-soft"}`}>
                    {l.english}
                  </span>
                  {on && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-white/30">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </Group>

        <ErrorNote message={error} />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="spark" className="px-6 py-3" disabled={busy}>
            {busy ? t("common.saving") : t("profile.save")}
          </Button>
          {saved && (
            <span className="pop flex items-center gap-1 text-sm font-semibold text-success" role="status">
              <Icon name="check" className="h-4 w-4" /> {t("profile.saved")}
            </span>
          )}
        </div>
      </form>

      <Group title={t("profile.account")}>
        <button onClick={logout} className="flex w-full items-center gap-3 px-6 py-4 text-left font-semibold text-danger transition-colors hover:bg-danger-soft">
          <Icon name="logout" className="h-5 w-5" /> {t("nav.signOut")}
        </button>
      </Group>
    </div>
  );
}
