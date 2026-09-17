"use client";

import { motion, useAnimate } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/i18n";
import Crest from "./Crest";
import Logo from "./Logo";
import { EASE, TextReveal } from "./motion";
import PageTransition from "./PageTransition";
import TutorAvatar from "./TutorAvatar";
import { Button, ErrorNote, Icon } from "./ui";

const field =
  "w-full rounded-md border border-line-strong bg-surface px-3.5 py-3 text-[15px] font-normal outline-none transition duration-300 placeholder:text-ink-soft/60 hover:border-ink/30 focus:border-navy focus:shadow-[0_0_0_4px_rgb(0_33_71/0.08)] dark:focus:border-ink";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formScope, animateForm] = useAnimate<HTMLFormElement>();

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
      animateForm(formScope.current, { x: [0, -8, 8, -6, 6, 0] }, { duration: 0.45 });
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    mode === "register" && (
      <label key="name" className="flex flex-col gap-2 text-sm font-medium">
        Full name
        <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" placeholder="Priya Sharma" />
      </label>
    ),
    <label key="email" className="flex flex-col gap-2 text-sm font-medium">
      Email address
      <input id="email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
    </label>,
    <label key="password" className="flex flex-col gap-2 text-sm font-medium">
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
    </label>,
    mode === "register" && (
      <label key="locale" className="flex flex-col gap-2 text-sm font-medium">
        Language of instruction
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
    ),
  ].filter(Boolean);

  return (
    <PageTransition className="grid min-h-dvh flex-1 lg:grid-cols-[1.05fr_1fr]">
      <aside className="grain relative hidden overflow-hidden bg-navy text-navy-ink lg:flex lg:flex-col">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-40 opacity-[0.06]"
          initial={{ rotate: -12, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 2.4, ease: EASE }}
        >
          <Crest className="h-[640px] w-[640px]" />
        </motion.div>
        <div className="relative flex flex-1 flex-col p-12">
          <Logo tagline className="text-white" />
          <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-6">
            <div className="flex flex-col gap-6 pb-6">
              <motion.span className="h-px w-16 origin-left bg-gold" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.4 }} />
              <TextReveal
                as="p"
                delay={0.3}
                className="font-display text-4xl leading-[1.1] text-white xl:text-5xl"
                parts={
                  mode === "login"
                    ? [{ text: "Welcome back." }, { text: "Your lessons are waiting.", className: "italic text-gold" }]
                    : [{ text: "Every expert was once" }, { text: "a beginner.", className: "italic text-gold" }]
                }
              />
              <motion.p
                className="max-w-sm leading-relaxed text-navy-ink/65"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: EASE, delay: 1 }}
              >
                {mode === "login"
                  ? "Asha has lined up your weakest skills first, so every minute counts."
                  : "Hi, I'm Asha. I'll find the gaps and help you close them. You can rename me or choose a different tutor later."}
              </motion.p>
            </div>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, ease: EASE, delay: 0.5 }}>
              <TutorAvatar gender="female" mood="happy" framing="full" stage={false} className="aspect-[3/5] w-48 xl:w-56" />
            </motion.div>
          </div>
        </div>
      </aside>

      <div className="flex flex-col px-5 py-6 sm:px-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <form ref={formScope} onSubmit={onSubmit} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-12">
          <div className="flex flex-col gap-3">
            <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.1 }}>
              {mode === "login" ? "Student sign in" : "Enrolment · free"}
            </motion.p>
            <TextReveal delay={0.15} className="font-display text-4xl leading-tight" parts={[{ text: mode === "login" ? "Sign in to continue" : "Create your account" }]} />
          </div>

          <motion.div
            className="flex flex-col gap-5"
            initial="hidden"
            animate="shown"
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }}
          >
            {fields.map((f, i) => (
              <motion.div key={i} variants={{ hidden: { opacity: 0, y: 16, filter: "blur(6px)" }, shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE } } }}>
                {f}
              </motion.div>
            ))}
          </motion.div>

          <ErrorNote message={error} />

          <motion.div className="flex flex-col gap-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}>
            <Button type="submit" disabled={busy} className="w-full py-3.5 text-[15px]">
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Enrol for free"}
              {!busy && <Icon name="arrow" className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-4 text-xs text-ink-soft">
              <span className="h-px flex-1 bg-line" />
              {mode === "login" ? "New to Aptitude Teacher?" : "Already enrolled?"}
              <span className="h-px flex-1 bg-line" />
            </div>
            <Link
              href={mode === "login" ? "/register" : "/login"}
              className="press rounded-md border border-line-strong py-3 text-center text-sm font-medium hover:border-ink/40 hover:bg-surface-2"
            >
              {mode === "login" ? "Create a free account" : "Sign in instead"}
            </Link>
          </motion.div>
        </form>
        <p className="flex justify-between text-xs text-ink-soft">
          <Link href="/" className="link-draw">
            ← Back to home
          </Link>
          <span>© {new Date().getFullYear()} Aptitude Teacher</span>
        </p>
      </div>
    </PageTransition>
  );
}
