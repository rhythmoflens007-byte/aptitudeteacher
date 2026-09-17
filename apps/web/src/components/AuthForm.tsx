"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, FormEvent, useEffect, useState } from "react";
import type { Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/i18n";
import TutorAvatar from "./TutorAvatar";
import { Button, ErrorNote, Icon } from "./ui";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

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
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base outline-none transition placeholder:text-ink-soft/60 focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="rise grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-surface/90 shadow-[var(--shadow-lg)] backdrop-blur md:grid-cols-2">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand p-8 text-accent-ink md:flex">
          <span aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
          <span aria-hidden className="absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-white/10" />
          <Link href="/" className="relative flex items-center gap-2 font-display text-xl font-semibold">
            <Image src="/icon.svg" alt="" width={32} height={32} unoptimized className="rounded-lg ring-2 ring-white/40" />
            Aptitude Teacher
          </Link>
          <TutorAvatar gender="female" mood="happy" stage={false} className="relative -my-4 aspect-square w-full" />
          <p className="relative font-display text-2xl leading-snug">
            {mode === "login" ? "Good to see you again. Let's pick up where you left off." : "Hi, I'm Asha. I'll find the gaps and help you close them. You can rename me or pick a different tutor later."}
          </p>
        </aside>

        <form onSubmit={onSubmit} key={shake} className={`flex flex-col gap-4 p-6 sm:p-10 ${shake ? "shake" : ""}`}>
          <Link href="/" className="mb-2 flex items-center gap-2 font-display text-lg font-semibold md:hidden">
            <Image src="/icon.svg" alt="" width={28} height={28} unoptimized />
            Aptitude Teacher
          </Link>
          <div>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-1 text-sm text-ink-soft">Quantitative · Logical Reasoning · Verbal</p>
          </div>
          {mode === "register" && (
            <label className="rise flex flex-col gap-1.5 text-sm font-medium" style={{ "--i": 1 } as CSSProperties}>
              Your name
              <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" placeholder="Priya Sharma" />
            </label>
          )}
          <label className="rise flex flex-col gap-1.5 text-sm font-medium" style={{ "--i": 2 } as CSSProperties}>
            Email
            <input id="email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
          </label>
          <label className="rise flex flex-col gap-1.5 text-sm font-medium" style={{ "--i": 3 } as CSSProperties}>
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
            {mode === "register" && <span className="text-xs font-normal text-ink-soft">At least 8 characters.</span>}
          </label>
          {mode === "register" && (
            <label className="rise flex flex-col gap-1.5 text-sm font-medium" style={{ "--i": 4 } as CSSProperties}>
              Preferred language
              <select id="locale" className={field} value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                    {l.label !== l.english ? ` · ${l.english}` : ""}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-ink-soft">Your tutor explains and speaks in this language. You can change it any time.</span>
            </label>
          )}
          <ErrorNote message={error} />
          <Button type="submit" disabled={busy} className="mt-2 py-3 text-base">
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            {!busy && <Icon name="arrow" className="h-4 w-4" />}
          </Button>
          <p className="text-center text-sm text-ink-soft">
            {mode === "login" ? (
              <>
                New here? <Link className="font-medium text-accent hover:underline" href="/register">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account? <Link className="font-medium text-accent hover:underline" href="/login">Sign in</Link>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
