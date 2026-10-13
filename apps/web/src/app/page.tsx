"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import { CountOnView, EASE, FadeIn, Magnetic, Orb, SmoothScroll, TextReveal } from "@/components/motion";
import PageTransition from "@/components/PageTransition";
import TutorAvatar from "@/components/TutorAvatar";
import { Blobs, buttonClass, Icon, Ring, SparkGlow, SpotlightCard } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import type { Locale } from "@/lib/api";
import { LANGUAGES } from "@/lib/i18n";
import { DEFAULT_TUTOR, TutorGender } from "@/lib/tutor";
import type { Mood } from "@/lib/tutorRig";
import { useMedia } from "@/lib/useMedia";
import { useTutorVoice } from "@/lib/useTutorVoice";

const NAV_LINKS = [
  ["How it works", "#how"],
  ["Features", "#features"],
  ["Languages", "#languages"],
  ["FAQ", "#faq"],
] as const;

const STORY = [
  {
    title: "It notices.",
    text: "Every wrong answer tells a story. Your tutor reads it — a slip, a guess, or a real gap in the idea.",
    tone: "iris",
  },
  {
    title: "It explains. Out loud.",
    text: "A short, playful lesson on exactly what you missed, spoken sentence by sentence with a smile and a wave.",
    tone: "coral",
  },
  {
    title: "Then it checks.",
    text: "A fresh question on the same idea comes straight back, so you know the gap is really closed.",
    tone: "lagoon",
  },
  {
    title: "Every day, a little smarter.",
    text: "Your next questions shift to your weakest skills, at just the right difficulty. No wasted practice.",
    tone: "sun",
  },
] as const;

const HELLO: Record<Locale, (name: string) => string> = {
  en: (n) => `Hi! I'm ${n}. Let's learn what you don't know yet — together!`,
  hi: (n) => `नमस्ते! मैं ${n} हूँ। चलिए, साथ मिलकर सीखते हैं!`,
  ta: (n) => `வணக்கம்! நான் ${n}. வாங்க, சேர்ந்து கற்றுக்கொள்வோம்!`,
  te: (n) => `నమస్కారం! నేను ${n}. రండి, కలిసి నేర్చుకుందాం!`,
};

const FAQ = [
  { q: "Is it really free?", a: "Yes. Practice, mock tests, progress tracking and your AI tutor are all free." },
  { q: "Which exams does it help with?", a: "Anything with an aptitude round: campus placements, company online tests, bank and SSC exams, and CAT-style quant and reasoning." },
  {
    q: "How does it know what I don't understand?",
    a: "It looks at the answer you picked, how long you took and the skill behind the question. A quick guess, a calculation slip and a real concept gap each get a different response.",
  },
  { q: "Which languages can the tutor teach in?", a: "English, हिन्दी, தமிழ் and తెలుగు. Switch any time, and ask your doubt out loud in that language." },
  { q: "Does the voice work on my phone?", a: "Yes, in Chrome and Edge. Microsoft Edge has the most natural Indian-language voices, and every reply is shown as text too." },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <PageTransition className="flex flex-1 flex-col overflow-x-clip">
      <SmoothScroll />
      <SiteNav />
      <main>
        <Hero />
        <Story />
        <Features />
        <Languages />
        <Numbers />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </PageTransition>
  );
}

/* ---------------- Navigation ---------------- */

function SiteNav() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => {
    setHidden(latest > (scrollY.getPrevious() ?? 0) && latest > 500);
    setScrolled(latest > 20);
  });

  return (
    <motion.header className="fixed inset-x-0 top-3 z-40 px-3" animate={{ y: hidden ? -90 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 32 }}>
      <div
        className={`mx-auto flex h-14 max-w-5xl items-center gap-6 rounded-full px-3 pl-4 transition-all duration-500 ${
          scrolled ? "glass shadow-[var(--shadow-md)] ring-1 ring-black/[0.04]" : ""
        }`}
      >
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link href="/login" className={buttonClass("ghost", "px-4 py-2 text-sm max-sm:hidden")}>
            Sign in
          </Link>
          <Link href="/register" className={buttonClass("primary", "px-4 py-2 text-sm")}>
            Start free
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

function SectionTitle({ eyebrow, title, text, center = true }: { eyebrow: string; title: ReactNode; text?: string; center?: boolean }) {
  return (
    <div className={`flex max-w-3xl flex-col gap-4 ${center ? "mx-auto items-center text-center" : ""}`}>
      <FadeIn>
        <p className="eyebrow">{eyebrow}</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <h2 className="font-display text-[2.6rem] leading-[1.02] text-balance sm:text-6xl">{title}</h2>
      </FadeIn>
      {text && (
        <FadeIn delay={0.12}>
          <p className="text-lg leading-relaxed text-ink-soft sm:text-xl">{text}</p>
        </FadeIn>
      )}
    </div>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  const [gender, setGender] = useState<TutorGender>("female");
  const wide = useMedia("(min-width: 768px)");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const orbY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const stageScale = useTransform(scrollYProgress, [0, 0.7], [1, 0.94]);

  return (
    <section ref={ref} className="relative overflow-hidden pb-24 pt-32 sm:pt-40">
      <Blobs />
      <motion.div style={{ y: orbY }} className="pointer-events-none absolute left-1/2 top-24 -z-0 h-[520px] w-[520px] -translate-x-1/2 opacity-40">
        <Orb className="h-full w-full" />
      </motion.div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center">
        <motion.a
          href="#how"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          className="glass press flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-medium shadow-[var(--shadow-sm)] ring-1 ring-black/[0.04]"
        >
          <span className="rounded-full bg-spark px-2.5 py-0.5 text-xs font-semibold text-white">New</span>
          Meet your playful AI tutor
          <Icon name="chevron" className="h-3.5 w-3.5 text-ink-soft" />
        </motion.a>

        <TextReveal
          delay={0.2}
          stagger={0.07}
          className="mt-8 font-display text-[3.4rem] leading-[0.95] text-balance sm:text-8xl lg:text-[7.5rem]"
          parts={[{ text: "Learn what you" }, { text: "don't know.", className: "text-spark" }]}
        />

        <motion.p
          className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-2xl sm:leading-relaxed"
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.8 }}
        >
          A playful AI tutor that finds your gaps, teaches them, and tests you again, in English, हिन्दी, தமிழ் and తెలుగు.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 1 }}
        >
          <Magnetic>
            <Link href="/register" className={buttonClass("spark", "px-8 py-4 text-[17px]")}>
              Start learning — free <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </Magnetic>
          <a href="#how" className={buttonClass("secondary", "px-6 py-4 text-[17px]")}>
            <Icon name="play" className="h-3.5 w-3.5" /> See how it works
          </a>
        </motion.div>

        <motion.div
          style={{ scale: stageScale }}
          initial={{ opacity: 0, y: 60, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.4, ease: EASE, delay: 1.1 }}
          className="mt-20 w-full"
        >
          <SparkGlow active className="mx-auto max-w-4xl rounded-[40px]">
            <div className="relative grid overflow-hidden rounded-[40px] bg-surface shadow-[var(--shadow-lg)] md:grid-cols-[1fr_1.1fr]">
              <div className="relative bg-gradient-to-b from-iris-soft via-surface to-surface">
                <TutorAvatar gender={gender} mood="happy" framing={wide ? "full" : "portrait"} className="mx-auto aspect-square w-64 md:aspect-[4/5] md:w-full" />
                <div className="absolute left-4 top-4 flex rounded-full bg-surface/90 p-1 text-sm shadow-[var(--shadow-sm)]" role="radiogroup" aria-label="Choose a tutor">
                  {(["female", "male"] as const).map((g) => (
                    <button key={g} role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className={`relative rounded-full px-3.5 py-1.5 font-semibold ${gender === g ? "text-white" : "text-ink-soft"}`}>
                      {gender === g && <motion.span layoutId="hero-gender" className="absolute inset-0 rounded-full bg-iris" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                      <span className="relative">{DEFAULT_TUTOR[g]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <HeroChat name={DEFAULT_TUTOR[gender]} />
            </div>
          </SparkGlow>
        </motion.div>
      </div>
    </section>
  );
}

/** A little scripted conversation that types itself out when the hero appears. */
function HeroChat({ name }: { name: string }) {
  const lines = [
    { from: "you", text: "Two trains 300 km apart move towards each other at 70 and 80 km/h. When do they meet?" },
    { from: "you", text: "I got 30 hours 😅" },
    { from: "tutor", text: "Ooh, so close to a classic trap! You subtracted the speeds." },
    { from: "tutor", text: "Coming towards each other, they close the gap together: 70 + 80 = 150 km/h. So 300 ÷ 150 = 2 hours. 🚆" },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 1900 : 1300);
    return () => clearTimeout(id);
  }, [shown, lines.length]);

  return (
    <div className="flex min-h-[380px] flex-col gap-3 p-5 text-left sm:p-7">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> {name} · Time, Speed &amp; Distance
      </div>
      <AnimatePresence initial={false}>
        {lines.slice(0, shown).map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className={`max-w-[88%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed ${
              line.from === "you" ? "ml-auto rounded-br-lg bg-iris text-white" : "rounded-bl-lg bg-surface-2 text-ink"
            }`}
          >
            {line.text}
          </motion.p>
        ))}
      </AnimatePresence>
      {shown < lines.length && shown >= 2 && (
        <span className="flex w-fit items-center gap-1 rounded-3xl rounded-bl-lg bg-surface-2 px-4 py-3" aria-label={`${name} is typing`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="typing-dot h-2 w-2 rounded-full bg-ink-faint" style={{ ["--i" as string]: i }} />
          ))}
        </span>
      )}
      <div className="mt-auto flex items-center gap-2 rounded-full bg-surface-2 p-1.5 pl-4 text-sm text-ink-faint">
        Ask anything…
        <span className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-spark text-white">
          <Icon name="mic" className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

/* ---------------- The pinned story ---------------- */

const TONE_CLASS = {
  iris: { text: "text-iris", bg: "bg-iris", soft: "bg-iris-soft" },
  coral: { text: "text-coral-600", bg: "bg-coral", soft: "bg-coral-soft" },
  lagoon: { text: "text-lagoon-600", bg: "bg-lagoon", soft: "bg-lagoon-soft" },
  sun: { text: "text-sun-600", bg: "bg-sun", soft: "bg-sun-soft" },
};

function StoryVisual({ index }: { index: number }) {
  const card = "w-full max-w-md rounded-[32px] bg-surface p-7 shadow-[var(--shadow-lg)]";
  if (index === 0)
    return (
      <div className={card}>
        <p className="text-sm text-ink-soft">You chose 30 hours · in 41 seconds</p>
        <p className="mt-2 font-display text-3xl">Why was that wrong?</p>
        <div className="mt-6 flex flex-col gap-2.5">
          {[
            ["Careless slip", false],
            ["Concept gap — speeds subtracted", true],
            ["Quick guess", false],
          ].map(([label, picked], i) => (
            <motion.div
              key={String(label)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: picked ? 1 : 0.4, x: 0, scale: picked ? 1.02 : 1 }}
              transition={{ delay: 0.15 * i, type: "spring", stiffness: 260, damping: 22 }}
              className={`rounded-2xl px-4 py-3 text-[15px] font-medium ${picked ? "bg-iris text-white shadow-[var(--shadow-iris)]" : "bg-surface-2"}`}
            >
              {label}
            </motion.div>
          ))}
        </div>
      </div>
    );
  if (index === 1)
    return (
      <div className={card}>
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Icon name="speaker" className="h-4 w-4 text-coral" /> Asha is explaining
        </p>
        <p className="mt-3 font-display text-3xl leading-tight">
          <span className="rounded-xl bg-coral-soft px-1 shadow-[0_0_0_4px_var(--coral-soft)]">Coming towards each other,</span> they close the gap together. 🙌
        </p>
        <div className="mt-6 rounded-2xl bg-surface-2 p-4 font-mono text-sm">70 + 80 = 150 km/h</div>
      </div>
    );
  if (index === 2)
    return (
      <div className={card}>
        <p className="text-sm text-ink-soft">Same idea, new numbers</p>
        <p className="mt-2 font-display text-2xl leading-snug">Two cyclists 90 km apart ride towards each other at 20 and 25 km/h. When do they meet?</p>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 18 }}
          className="mt-6 flex items-center gap-3 rounded-2xl bg-success-soft px-4 py-3 font-semibold text-success"
        >
          <Icon name="check" className="h-5 w-5" /> 2 hours — nailed it!
          <span className="ml-auto rounded-full bg-sun px-2.5 py-0.5 text-xs text-ink">+30 XP</span>
        </motion.div>
      </div>
    );
  return (
    <div className={`${card} flex items-center gap-6`}>
      <Ring value={78} size={120} stroke={14} tone="spark">
        <span className="font-display text-2xl">78%</span>
      </Ring>
      <div className="flex flex-1 flex-col gap-3">
        {[
          ["Relative speed", 61, "bg-coral"],
          ["Syllogisms", 41, "bg-lagoon"],
          ["Percentages", 88, "bg-iris"],
        ].map(([skill, value, colour]) => (
          <div key={String(skill)}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{skill}</span>
              <span className="font-semibold">{value}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <motion.div className={`h-full rounded-full ${colour}`} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1.4, ease: EASE }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Story() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(STORY.length - 1, Math.max(0, Math.floor(v * STORY.length)))));

  return (
    <section id="how" className="scroll-mt-20">
      <div className="px-4 pt-16 sm:pt-24">
        <SectionTitle eyebrow="How it works" title="A tutor that actually teaches." text="Most apps show you the answer and move on. This one doesn't move on until you've got it." />
      </div>

      <div ref={ref} className="relative hidden lg:block" style={{ height: `${STORY.length * 90}vh` }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-16 px-8">
            <div className="flex flex-col gap-8">
              {STORY.map((step, i) => {
                const on = i === active;
                const tone = TONE_CLASS[step.tone];
                return (
                  <motion.div key={step.title} animate={{ opacity: on ? 1 : 0.28, x: on ? 0 : -8 }} transition={{ duration: 0.6, ease: EASE }}>
                    <div className="flex items-center gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white ${tone.bg}`}>{i + 1}</span>
                      <h3 className="font-display text-4xl">{step.title}</h3>
                    </div>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.6, ease: EASE }}
                          className="overflow-hidden pl-12 pt-3 text-lg leading-relaxed text-ink-soft"
                        >
                          {step.text}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
            <div className="relative flex min-h-[460px] items-center justify-center">
              <motion.div
                aria-hidden
                className={`absolute h-80 w-80 rounded-full blur-3xl ${TONE_CLASS[STORY[active].tone].bg}`}
                animate={{ opacity: 0.28, scale: [1, 1.1, 1] }}
                transition={{ scale: { duration: 4, repeat: Infinity } }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="relative flex w-full justify-center"
                  initial={{ opacity: 0, y: 50, scale: 0.9, rotate: -2, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -40, scale: 0.95, rotate: 2, filter: "blur(8px)" }}
                  transition={{ type: "spring", stiffness: 180, damping: 22 }}
                >
                  <StoryVisual index={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-xl flex-col gap-16 px-4 py-20 lg:hidden">
        {STORY.map((step, i) => (
          <FadeIn key={step.title} className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white ${TONE_CLASS[step.tone].bg}`}>{i + 1}</span>
              <h3 className="font-display text-3xl">{step.title}</h3>
            </div>
            <p className="text-lg text-ink-soft">{step.text}</p>
            <StoryVisual index={i} />
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Features ---------------- */

function Features() {
  const days = [3, 6, 4, 8, 5, 9, 11];
  return (
    <section id="features" className="scroll-mt-20 px-4 py-24 sm:py-36">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <SectionTitle eyebrow="Features" title="Everything you need. Nothing you don't." />
        <div className="grid gap-5 md:grid-cols-6">
          <FadeIn className="md:col-span-4">
            <SpotlightCard tint="iris" className="h-full p-8 sm:p-10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-iris-soft text-iris">
                <Icon name="target" className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-display text-3xl">Practice that adapts to you.</h3>
              <p className="mt-2 max-w-md text-ink-soft">1,200+ questions, and a brand-new one whenever you run out. Each one picked from your weakest skill, at your level.</p>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  ["Percentages", 88, "bg-iris"],
                  ["Time & Work", 64, "bg-lagoon"],
                  ["Syllogisms", 41, "bg-sun"],
                  ["Relative speed", 23, "bg-coral"],
                ].map(([skill, value, colour], i) => (
                  <div key={String(skill)} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 text-ink-soft">{skill}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <motion.span
                        className={`block h-full rounded-full ${colour}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: EASE, delay: i * 0.1 }}
                      />
                    </span>
                    <span className="w-10 text-right font-semibold">{value}%</span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </FadeIn>

          <FadeIn delay={0.1} className="md:col-span-2">
            <SpotlightCard tint="coral" className="h-full p-8">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-coral-soft text-coral-600">
                <Icon name="brain" className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-display text-3xl">Mistakes, decoded.</h3>
              <p className="mt-2 text-ink-soft">A slip, a guess and a gap each get their own fix.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Careless slip", "Concept gap", "Quick guess"].map((label, i) => (
                  <span key={label} className="float rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium" style={{ ["--i" as string]: i }}>
                    {label}
                  </span>
                ))}
              </div>
            </SpotlightCard>
          </FadeIn>

          <FadeIn className="md:col-span-2">
            <SpotlightCard tint="lagoon" className="h-full p-8">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lagoon-soft text-lagoon-600">
                <Icon name="clipboard" className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-display text-3xl">Mock tests.</h3>
              <p className="mt-2 text-ink-soft">15 questions, 15 minutes, a report on every section.</p>
              <div className="mt-6 flex justify-center">
                <Ring value={80} size={110} stroke={12} tone="lagoon">
                  <span className="font-display text-2xl">12/15</span>
                </Ring>
              </div>
            </SpotlightCard>
          </FadeIn>

          <FadeIn delay={0.08} className="md:col-span-2">
            <SpotlightCard tint="sun" className="h-full p-8">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sun-soft text-sun-600">
                <Icon name="camera" className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-display text-3xl">Snap a doubt.</h3>
              <p className="mt-2 text-ink-soft">Photograph any question. Get it explained step by step.</p>
              <div className="wiggle-hover mt-6 rounded-2xl border-2 border-dashed border-line-strong p-5 text-center text-sm text-ink-soft">question.jpg → solved ✨</div>
            </SpotlightCard>
          </FadeIn>

          <FadeIn delay={0.16} className="md:col-span-2">
            <SpotlightCard tint="iris" className="h-full p-8">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3ecfe] text-violet">
                <Icon name="flame" className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-display text-3xl">Streaks & XP.</h3>
              <p className="mt-2 text-ink-soft">Daily goals, levels and badges keep you coming back.</p>
              <div className="mt-6 flex h-20 items-end gap-1.5">
                {days.map((d, i) => (
                  <motion.span
                    key={i}
                    className={`flex-1 origin-bottom rounded-lg ${i === days.length - 1 ? "bg-spark" : "bg-iris-soft"}`}
                    style={{ height: `${(d / 11) * 100}%` }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200, damping: 16, delay: i * 0.06 }}
                  />
                ))}
              </div>
            </SpotlightCard>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Languages ---------------- */

function Languages() {
  const voice = useTutorVoice();
  const [locale, setLocale] = useState<Locale>("en");
  const [gender, setGender] = useState<TutorGender>("female");
  const name = DEFAULT_TUTOR[gender];
  const tones = ["iris", "coral", "lagoon", "sun"] as const;
  const mood: Mood = voice.speaking ? "neutral" : "happy";

  function hello(code: Locale) {
    setLocale(code);
    voice.say(HELLO[code](name), `hello-${code}`, gender);
  }

  return (
    <section id="languages" className="relative scroll-mt-20 overflow-hidden px-4 py-24 sm:py-36">
      <Blobs className="opacity-60" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-14">
        <SectionTitle eyebrow="Languages" title={<>One tutor. <span className="text-spark">Four languages.</span></>} text="Tap a language and say hello. Your tutor answers, explains and listens in it." />
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <FadeIn>
            <SparkGlow active={voice.speaking} className="mx-auto w-full max-w-sm rounded-[40px]">
              <div className="relative overflow-hidden rounded-[40px] bg-surface shadow-[var(--shadow-lg)]">
                <TutorAvatar gender={gender} voice={voice} mood={mood} framing="full" className="aspect-[4/5] w-full" />
                <button
                  onClick={() => setGender(gender === "female" ? "male" : "female")}
                  className="press absolute right-4 top-4 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-sm)]"
                >
                  Switch to {DEFAULT_TUTOR[gender === "female" ? "male" : "female"]}
                </button>
              </div>
            </SparkGlow>
          </FadeIn>
          <div className="grid gap-4 sm:grid-cols-2">
            {LANGUAGES.map((l, i) => {
              const tone = TONE_CLASS[tones[i]];
              const on = locale === l.code && voice.activeKey === `hello-${l.code}`;
              return (
                <FadeIn key={l.code} delay={i * 0.06}>
                  <button
                    onClick={() => (on ? voice.stop() : hello(l.code))}
                    className={`press group relative w-full overflow-hidden rounded-[28px] bg-surface p-6 text-left shadow-[var(--shadow-md)] ring-2 transition-all duration-500 hover:shadow-[var(--shadow-lg)] ${on ? "ring-iris" : "ring-transparent"}`}
                  >
                    <span className={`absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-60 blur-2xl transition-transform duration-700 group-hover:scale-150 ${tone.bg}`} />
                    <span className="relative flex items-center justify-between">
                      <span className={`text-sm font-semibold ${tone.text}`}>{l.english}</span>
                      <span className={`grid h-10 w-10 place-items-center rounded-full text-white ${tone.bg}`}>
                        <Icon name={on ? "stop" : "speaker"} className="h-4 w-4" />
                      </span>
                    </span>
                    <span className="relative mt-4 block font-display text-4xl" dir="auto">
                      {l.label}
                    </span>
                    <span className="relative mt-2 block text-sm text-ink-soft" dir="auto">
                      {HELLO[l.code](name).split(/(?<=[.!।])\s+/).slice(0, 2).join(" ")}
                    </span>
                  </button>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Numbers, FAQ, CTA, footer ---------------- */

function Numbers() {
  const stats = [
    { value: 1200, suffix: "+", label: "practice questions", tone: "text-iris" },
    { value: 28, suffix: "", label: "topics across 3 sections", tone: "text-coral" },
    { value: 4, suffix: "", label: "languages", tone: "text-lagoon-600" },
    { value: 100, suffix: "%", label: "free", tone: "text-sun-600" },
  ];
  return (
    <section className="px-4 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.06} className="rounded-[28px] bg-surface p-7 text-center shadow-[var(--shadow-sm)]">
            <span className={`font-display text-5xl sm:text-6xl ${s.tone}`}>
              <CountOnView value={s.value} suffix={s.suffix} />
            </span>
            <span className="mt-1 block text-ink-soft">{s.label}</span>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 px-4 py-24 sm:py-36">
      <div className="mx-auto flex max-w-3xl flex-col gap-12">
        <SectionTitle eyebrow="FAQ" title="Questions? Answered." />
        <FadeIn className="flex flex-col gap-3">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className={`rounded-[26px] bg-surface shadow-[var(--shadow-sm)] transition-shadow duration-500 ${isOpen ? "shadow-[var(--shadow-md)]" : ""}`}>
                <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left">
                  <span className="text-lg font-semibold">{item.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 45 : 0, backgroundColor: isOpen ? "#5b5bf5" : "#f5f3ef", color: isOpen ? "#ffffff" : "#17171f" }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full">
                    <Icon name="plus" className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: EASE }} className="overflow-hidden">
                      <p className="px-6 pb-6 leading-relaxed text-ink-soft">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </FadeIn>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-24">
      <FadeIn>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[48px] bg-spark px-6 py-24 text-center text-white sm:py-32">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.3),transparent_45%)]" />
          <motion.div aria-hidden className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/15 blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="font-display text-5xl leading-[1] text-balance sm:text-7xl">Your first lesson starts now.</h2>
            <p className="max-w-lg text-lg text-white/85">Five minutes. A few questions. Your tutor will know exactly where to begin.</p>
            <Magnetic>
              <Link href="/register" className="press shine mt-2 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[17px] font-semibold text-ink shadow-[var(--shadow-lg)]">
                Start learning — free <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-4 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 border-t border-line pt-8 sm:flex-row">
        <Logo />
        <nav className="flex flex-wrap justify-center gap-5 text-sm text-ink-soft">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="link-draw hover:text-ink">
              {label}
            </a>
          ))}
          <Link href="/login" className="link-draw hover:text-ink">
            Sign in
          </Link>
        </nav>
        <p className="text-sm text-ink-faint">© {new Date().getFullYear()} Aptitude Teacher · Made in India</p>
      </div>
    </footer>
  );
}
