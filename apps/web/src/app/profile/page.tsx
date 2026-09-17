"use client";

import { CSSProperties, FormEvent, useState } from "react";
import AppShell from "@/components/AppShell";
import TutorCustomizer from "@/components/TutorCustomizer";
import { Button, Card, ErrorNote, Icon, IconTile, PageHeader } from "@/components/ui";
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
    "rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base font-normal shadow-[var(--shadow-sm)] outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Settings"
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-ink">
              {(user?.display_name.trim().charAt(0) || "?").toUpperCase()}
            </span>
            <span className="min-w-0 truncate">{user?.display_name}</span>
          </span>
        }
        description={user?.email}
      />

      <Card className="rise p-0" style={{ "--i": 1 } as CSSProperties}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
          <IconTile name="sparkles" tone="accent" />
          <div>
            <h2 className="font-semibold tracking-tight">{t("tutor.yourTutor")}</h2>
            <p className="text-sm text-ink-soft">Choose who teaches you. The name and voice carry through practice, lessons and chat.</p>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <TutorCustomizer />
        </div>
      </Card>

      <Card className="rise p-5 sm:p-6" style={{ "--i": 2 } as CSSProperties}>
        <h2 className="mb-4 font-semibold tracking-tight">{t("profile.title")}</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("profile.name")}
            <input id="profile-name" className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">{t("profile.language")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={locale === l.code}
                  onClick={() => setLocale(l.code)}
                  className={`press rounded-lg border px-3 py-2.5 text-left text-sm ${locale === l.code ? "border-accent bg-accent-soft font-medium text-ink shadow-[0_0_0_1px_var(--accent)]" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink"}`}
                >
                  <span className="block" dir="auto">
                    {l.label}
                  </span>
                  {l.label !== l.english && <span className="block text-[11px] opacity-70">{l.english}</span>}
                </button>
              ))}
            </div>
            <span className="text-xs text-ink-soft">
              Your tutor replies, explains and speaks in this language, and listens for it when you use the mic. App menus are translated into English,
              Hindi and Tamil; other languages show English menus.
            </span>
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

      <Card className="rise flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6" style={{ "--i": 3 } as CSSProperties}>
        <div>
          <h2 className="font-semibold tracking-tight">Account</h2>
          <p className="text-sm text-ink-soft">Signed in as {user?.email}</p>
        </div>
        <Button variant="secondary" onClick={logout}>
          <Icon name="logout" className="h-4 w-4" /> {t("nav.signOut")}
        </Button>
      </Card>
    </div>
  );
}
