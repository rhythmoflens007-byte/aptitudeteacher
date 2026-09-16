"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/i18n";
import Avatar from "./Avatar";
import { Button, ErrorNote } from "./ui";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name, locale);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl items-center gap-10 md:grid-cols-2">
        <div className="hidden flex-col items-center text-center md:flex">
          <Avatar speaking={false} viseme="rest" wordTick={0} mood="happy" size={240} />
          <p className="mt-4 max-w-xs font-display text-2xl leading-snug">
            {mode === "login" ? "Good to see you again. Let's pick up where you left off." : "Hi, I'm Asha. I'll find the gaps and help you close them."}
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <h1 className="font-display text-3xl font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
            <p className="mt-1 text-sm text-ink-soft">Quantitative · Logical Reasoning · Verbal</p>
          </div>
          {mode === "register" && (
            <label className="flex flex-col gap-1.5 text-sm">
              Your name
              <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            Email
            <input id="email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Password
            <input
              id="password"
              type="password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "register" && <span className="text-xs text-ink-soft">At least 8 characters.</span>}
          </label>
          {mode === "register" && (
            <label className="flex flex-col gap-1.5 text-sm">
              Preferred language
              <select id="locale" className={field} value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ErrorNote message={error} />
          <Button type="submit" disabled={busy} className="mt-1">
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
          <p className="text-center text-sm text-ink-soft">
            {mode === "login" ? (
              <>
                New here? <Link className="font-medium text-accent" href="/register">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account? <Link className="font-medium text-accent" href="/login">Sign in</Link>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
