"use client";

import { CSSProperties, FormEvent, useState } from "react";
import AppShell from "@/components/AppShell";
import TutorCustomizer from "@/components/TutorCustomizer";
import { Button, Card, ErrorNote, Icon, Label } from "@/components/ui";
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

  const field =
    "rounded-xl border border-line bg-surface px-3.5 py-3 text-base outline-none transition focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-ink font-display text-3xl font-semibold text-paper shadow-[var(--shadow-md)]">
          {(user?.display_name.trim().charAt(0) || "?").toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-semibold">{user?.display_name}</h1>
          <p className="truncate text-sm text-ink-soft">{user?.email}</p>
        </div>
      </div>

      <Card className="rise" style={{ "--i": 1 } as CSSProperties}>
        <div className="mb-5 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-accent-ink">
            <Icon name="sparkles" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold">{t("tutor.yourTutor")}</h2>
            <p className="text-sm text-ink-soft">Choose who teaches you. The name and voice carry through practice, lessons and chat.</p>
          </div>
        </div>
        <TutorCustomizer />
      </Card>

      <Card className="rise" style={{ "--i": 2 } as CSSProperties}>
        <h2 className="mb-4 font-display text-xl font-semibold">{t("profile.title")}</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("profile.name")}
            <input id="profile-name" className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">{t("profile.language")}</legend>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={locale === l.code}
                  onClick={() => setLocale(l.code)}
                  className={`press rounded-xl border px-3 py-3 text-sm transition ${locale === l.code ? "border-accent bg-accent-soft font-medium text-accent" : "border-line bg-surface text-ink-soft hover:text-ink"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-ink-soft">Changes the app, the tutor&apos;s replies, and the voice used for speaking and listening.</span>
          </fieldset>
          <ErrorNote message={error} />
          <div className="flex items-center gap-3">
            <Button type="submit">{t("profile.save")}</Button>
            {saved && (
              <span className="pop flex items-center gap-1 text-sm text-good" role="status">
                <Icon name="check" className="h-4 w-4" /> {t("profile.saved")}
              </span>
            )}
          </div>
        </form>
      </Card>

      <div>
        <Label>Account</Label>
        <Button variant="secondary" onClick={logout} className="mt-2">
          <Icon name="logout" className="h-4 w-4" /> {t("nav.signOut")}
        </Button>
      </div>
    </div>
  );
}
