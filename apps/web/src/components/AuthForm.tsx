"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, FormEvent, useEffect, useState } from "react";
import type { Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/i18n";
import Logo from "./Logo";
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
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[15px] font-normal shadow-[var(--shadow-sm)] outline-none transition placeholder:text-ink-soft/60 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]";

  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <form onSubmit={onSubmit} key={shake} className={`mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 py-10 ${shake ? "shake" : ""}`}>
          <div>
            <h1 className="font-display text-3xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              {mode === "login" ? "Sign in to continue your practice." : "Free forever. Quant, Logical Reasoning and Verbal."}
            </p>
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
          <Button type="submit" disabled={busy} className="py-3 text-[15px]">
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            {!busy && <Icon name="arrow" className="h-4 w-4" />}
          </Button>
          <p className="text-center text-sm text-ink-soft">
            {mode === "login" ? (
              <>
                New here?{" "}
                <Link className="font-medium text-ink underline-offset-4 hover:underline" href="/register">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link className="font-medium text-ink underline-offset-4 hover:underline" href="/login">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </form>
        <p className="text-center text-xs text-ink-soft">© {new Date().getFullYear()} Aptitude Teacher</p>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-line bg-surface lg:flex lg:flex-col">
        <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
        <div aria-hidden className="bg-glow absolute inset-0" />
        <div className="relative flex flex-1 flex-col items-center justify-center gap-6 p-12">
          <TutorAvatar gender="female" mood="happy" framing="full" className="aspect-[4/5] w-full max-w-sm" />
          <figure className="max-w-md rounded-2xl border border-line bg-surface/90 p-5 shadow-[var(--shadow-md)] backdrop-blur">
            <blockquote className="text-[15px] leading-relaxed">
              {mode === "login"
                ? "Good to see you again. Let's pick up where you left off — I've lined up your weakest skills first."
                : "Hi, I'm Asha. I'll find the gaps and help you close them. You can rename me or pick a different tutor later."}
            </blockquote>
            <figcaption className="mt-3 flex items-center gap-2 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">A</span>
              <span className="font-medium">Asha</span>
              <span className="text-ink-soft">· your AI tutor</span>
            </figcaption>
          </figure>
        </div>
      </aside>
    </div>
  );
}
