"use client";

import { FormEvent, useState } from "react";
import AppShell from "@/components/AppShell";
import { Button, Card, ErrorNote } from "@/components/ui";
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

  const field = "rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="font-display text-3xl font-semibold">{t("profile.title")}</h1>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">{user?.email}</p>
          <label className="flex flex-col gap-1.5 text-sm">
            {t("profile.name")}
            <input id="profile-name" className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            {t("profile.language")}
            <select id="profile-locale" className={field} value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-ink-soft">Changes the app, the tutor&apos;s replies, and the voice used for speaking and listening.</span>
          </label>
          <ErrorNote message={error} />
          <div className="flex items-center gap-3">
            <Button type="submit">{t("profile.save")}</Button>
            {saved && <span className="text-sm text-good" role="status">✓ {t("profile.saved")}</span>}
          </div>
        </form>
      </Card>
      <Button variant="secondary" onClick={logout} className="self-start">
        {t("nav.signOut")}
      </Button>
    </div>
  );
}
