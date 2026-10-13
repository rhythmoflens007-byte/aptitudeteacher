"use client";

import { motion, useAnimate } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, type Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, setGuestLocale, useT } from "@/lib/i18n";
import LanguageMenu from "./LanguageMenu";
import Logo from "./Logo";
import { EASE, Orb } from "./motion";
import PageTransition from "./PageTransition";
import { ThemeToggle } from "./ThemeToggle";
import TutorAvatar from "./TutorAvatar";
import { Blobs, Button, ErrorNote, Icon } from "./ui";

const field =
  "w-full rounded-2xl bg-surface-2 px-4 py-3.5 text-[16px] font-normal outline-none ring-2 ring-transparent transition duration-300 placeholder:text-ink-faint hover:bg-surface-3 focus:bg-surface focus:ring-iris";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const { t, locale, errorText } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 401 ? t("auth.badLogin") : status === 409 ? t("auth.emailTaken") : errorText(err));
      animateForm(formScope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.45 });
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    mode === "register" && (
      <label key="name" className="flex flex-col gap-2 text-sm font-semibold">
        {t("auth.name")}
        <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" placeholder="Priya Sharma" />
      </label>
    ),
    <label key="email" className="flex flex-col gap-2 text-sm font-semibold">
      {t("auth.email")}
      <input id="email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
    </label>,
    <label key="password" className="flex flex-col gap-2 text-sm font-semibold">
      {t("auth.password")}
      <input
        id="password"
        type="password"
        className={field}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={mode === "register" ? 8 : undefined}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        placeholder={mode === "register" ? t("auth.passwordHint") : undefined}
      />
    </label>,
    mode === "register" && (
      <fieldset key="locale" className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{t("auth.learnIn")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              aria-pressed={locale === l.code}
              lang={l.code}
              onClick={() => setGuestLocale(l.code as Locale)}
              className={`press rounded-2xl px-3 py-2.5 text-[15px] font-semibold ${locale === l.code ? "bg-iris text-white shadow-[var(--shadow-iris)]" : "bg-surface-2 text-ink-soft hover:text-ink"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>
    ),
  ].filter(Boolean);

  return (
    <PageTransition className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <Blobs />
      <div aria-hidden className="pointer-events-none absolute -right-40 top-1/3 h-[520px] w-[520px] opacity-30">
        <Orb className="h-full w-full" />
      </div>

      <div className="relative flex items-center justify-between gap-2 px-5 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-1">
          <LanguageMenu />
          <ThemeToggle />
          <Link href="/" className="press rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink max-sm:hidden">
            ← {t("auth.home")}
          </Link>
        </div>
      </div>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-10 pt-16">
        <motion.div
          className="relative w-full max-w-md"
          initial={{ opacity: 0, y: 40, scale: 0.96, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
        >
          <motion.div
            className="absolute -top-24 left-1/2 z-10 h-32 w-32 -translate-x-1/2 overflow-hidden rounded-full bg-gradient-to-b from-iris-soft to-surface shadow-[var(--shadow-md)] ring-4 ring-surface"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.3 }}
          >
            <TutorAvatar gender="female" mood="happy" framing="portrait" stage={false} className="h-full w-full" />
          </motion.div>

          <form ref={formScope} onSubmit={onSubmit} className="glass flex flex-col gap-5 rounded-[36px] px-6 pb-8 pt-14 shadow-[var(--shadow-lg)] ring-1 ring-hairline sm:px-9">
            <div className="text-center">
              <h1 className="font-display text-3xl sm:text-4xl">{mode === "login" ? t("auth.welcomeBack") : t("auth.getStarted")}</h1>
              <p className="mt-2 text-ink-soft">{mode === "login" ? t("auth.loginSub") : t("auth.registerSub")}</p>
            </div>

            <motion.div
              className="flex flex-col gap-4"
              initial="hidden"
              animate="shown"
              variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } } }}
            >
              {fields.map((f, i) => (
                <motion.div key={i} variants={{ hidden: { opacity: 0, y: 14 }, shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } }}>
                  {f}
                </motion.div>
              ))}
            </motion.div>

            <ErrorNote message={error} />

            <Button type="submit" variant="spark" disabled={busy} className="w-full py-4 text-[17px]">
              {busy ? t("common.oneMoment") : mode === "login" ? t("auth.signIn") : t("auth.create")}
              {!busy && <Icon name="arrow" className="h-4 w-4" />}
            </Button>

            <p className="text-center text-sm text-ink-soft">
              {mode === "login" ? t("auth.newHere") : t("auth.haveAccount")}{" "}
              <Link href={mode === "login" ? "/register" : "/login"} className="font-semibold text-iris hover:underline">
                {mode === "login" ? t("auth.createLink") : t("auth.signIn")}
              </Link>
            </p>
          </form>
        </motion.div>
      </main>
    </PageTransition>
  );
}
