"use client";

import { motion } from "motion/react";
import { FormEvent, ReactNode, useState } from "react";
import AppShell from "@/components/AppShell";
import { FadeIn } from "@/components/motion";
import TutorCustomizer from "@/components/TutorCustomizer";
import { Button, ErrorNote, Icon, PageHeader } from "@/components/ui";
import type { Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, useT } from "@/lib/i18n";

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
      <p className="px-4 text-sm font-semibold text-ink-soft">{title}</p>
      <div className="overflow-hidden rounded-[28px] bg-surface shadow-[var(--shadow-md)]">{children}</div>
      {note && <p className="px-4 text-xs text-ink-soft">{note}</p>}
    </FadeIn>
  );
}

function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const { t } = useT();
  const [name, setName] = useState(user?.display_name ?? "");
  const [locale, setLocale] = useState<Locale>(user?.locale ?? "en");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ display_name: name, locale });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  const tones = ["bg-iris", "bg-coral", "bg-lagoon", "bg-sun"];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Settings"
        title={
          <span className="flex items-center gap-4">
            <motion.span
              initial={{ scale: 0.6, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-spark text-2xl font-bold text-white shadow-[var(--shadow-md)]"
            >
              {(user?.display_name.trim().charAt(0) || "?").toUpperCase()}
            </motion.span>
            <span className="min-w-0 truncate">{user?.display_name}</span>
          </span>
        }
        description={user?.email}
      />

      <Group title={t("tutor.yourTutor")} note="Your tutor's name and voice carry through practice, lessons and chat.">
        <div className="p-6">
          <TutorCustomizer />
        </div>
      </Group>

      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <Group title={t("profile.title")}>
          <label className="flex items-center gap-4 px-6 py-4">
            <span className="w-32 shrink-0 text-sm font-semibold">{t("profile.name")}</span>
            <input id="profile-name" className="min-w-0 flex-1 bg-transparent text-right text-[16px] outline-none" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </label>
          <div className="mx-6 h-px bg-line" />
          <div className="flex items-center gap-4 px-6 py-4">
            <span className="w-32 shrink-0 text-sm font-semibold">Email</span>
            <span className="min-w-0 flex-1 truncate text-right text-ink-soft">{user?.email}</span>
          </div>
        </Group>

        <Group title={t("profile.language")} note="Your tutor replies, explains and listens in this language. Menus are translated too.">
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            {LANGUAGES.map((l, i) => {
              const on = locale === l.code;
              return (
                <motion.button
                  key={l.code}
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={on}
                  onClick={() => setLocale(l.code)}
                  className={`relative overflow-hidden rounded-3xl p-4 text-left transition-colors duration-300 ${on ? `${tones[i]} text-white shadow-[var(--shadow-md)]` : "bg-surface-2 text-ink"}`}
                >
                  <span className="block font-display text-2xl" dir="auto">
                    {l.label}
                  </span>
                  <span className={`block text-xs ${on ? "text-white/80" : "text-ink-soft"}`}>{l.english}</span>
                  {on && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-white/25">
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
          <Button type="submit" variant="spark" className="px-6 py-3">
            {t("profile.save")}
          </Button>
          {saved && (
            <span className="pop flex items-center gap-1 text-sm font-semibold text-success" role="status">
              <Icon name="check" className="h-4 w-4" /> {t("profile.saved")}
            </span>
          )}
        </div>
      </form>

      <Group title="Account">
        <button onClick={logout} className="flex w-full items-center gap-3 px-6 py-4 text-left font-semibold text-danger transition-colors hover:bg-danger-soft">
          <Icon name="logout" className="h-5 w-5" /> {t("nav.signOut")}
        </button>
      </Group>
    </div>
  );
}
