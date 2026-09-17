"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import Crest from "@/components/Crest";
import Logo from "@/components/Logo";
import { CountOnView, EASE, FadeIn, IntroCurtain, Magnetic, Parallax, ScrollFillText, SmoothScroll, TextReveal } from "@/components/motion";
import PageTransition from "@/components/PageTransition";
import TutorAvatar from "@/components/TutorAvatar";
import { buttonClass, Icon } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/i18n";
import { DEFAULT_TUTOR, TutorGender } from "@/lib/tutor";
import { useMedia } from "@/lib/useMedia";

const NAV_LINKS = [
  ["The method", "#method"],
  ["Programmes", "#programmes"],
  ["Your tutor", "#tutor"],
  ["FAQ", "#faq"],
] as const;

const EXAMS = ["Campus placements", "Bank PO & Clerk", "SSC CGL", "CAT-style Quant", "Company assessments", "Railway exams"];

const METHOD = [
  {
    step: "Diagnose",
    title: "Find the real reason you got it wrong.",
    text: "Every wrong answer is classified — a careless slip, a concept gap, or a method that went off track — using your choice, your time and the skill behind the question.",
  },
  {
    step: "Teach",
    title: "Learn that exact idea, not just the answer.",
    text: "Concept gaps get a short lesson on the one idea you missed, explained out loud by your tutor, sentence by sentence.",
  },
  {
    step: "Re-test",
    title: "Prove the gap is closed.",
    text: "A fresh question on the same skill comes straight back. Get it right and your mastery rises; miss it and the lesson adapts.",
  },
  {
    step: "Adapt",
    title: "Your path rewrites itself every day.",
    text: "Your next questions and daily goal shift toward the skills with the lowest mastery, at the difficulty you're ready for.",
  },
];

const PROGRAMMES = [
  {
    numeral: "I",
    name: "Quantitative Aptitude",
    blurb: "Numbers, rates and reasoning with data.",
    subjects: ["Percentages", "Time and Work", "Time, Speed and Distance", "Profit and Loss", "Ratio and Proportion", "Simple and Compound Interest", "Averages", "Number System", "Mixtures and Alligation", "Probability", "Permutations and Combinations"],
  },
  {
    numeral: "II",
    name: "Logical Reasoning",
    blurb: "Patterns, arrangements and sound conclusions.",
    subjects: ["Syllogisms", "Number Series", "Blood Relations", "Coding-Decoding", "Direction Sense", "Seating Arrangement", "Clocks and Calendars", "Statements and Conclusions", "Classification and Analogies"],
  },
  {
    numeral: "III",
    name: "Verbal Ability",
    blurb: "Precise reading, grammar and vocabulary.",
    subjects: ["Analogies", "Synonyms and Antonyms", "Sentence Correction", "Fill in the Blanks", "Idioms and Phrases", "One-Word Substitution", "Para Jumbles", "Reading Comprehension"],
  },
];

const COMPARE: [string, ReactNode, ReactNode][] = [
  ["Questions with worked solutions", true, true],
  ["Timed, section-wise mock tests", true, true],
  ["Picks questions from your weakest skills", false, true],
  ["Explains why you got it wrong", false, true],
  ["Teaches the concept, then re-tests it", false, true],
  ["Talking tutor in your own language", false, true],
  ["Price", "Often paid", "Free"],
];

const FAQ = [
  {
    q: "Is it really free?",
    a: "Yes. Adaptive practice, mock tests, progress tracking and the tutor are free. Voice uses your browser's built-in speech, so there's nothing extra to pay for.",
  },
  {
    q: "Which exams does it prepare me for?",
    a: "Any test with an aptitude section: campus placement tests, company online assessments, bank and SSC exams, and CAT-style quantitative and reasoning practice.",
  },
  {
    q: "How does it know what I don't understand?",
    a: "It looks at which answer you chose, how long you took and the skill behind the question. A quick guess, a calculation slip and a real concept gap each get a different response — and every skill has its own mastery score.",
  },
  {
    q: "Which languages can the tutor teach in?",
    a: `${LANGUAGES.map((l) => l.english).join(", ")}. You can switch at any time, and speak your doubt in that language using the mic.`,
  },
  {
    q: "Does voice work on my phone?",
    a: "Yes, in Chrome and Edge. Microsoft Edge has the most natural voices for Indian languages. Every reply is also shown as text.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <PageTransition className="flex flex-1 flex-col">
      <SmoothScroll />
      <IntroCurtain />
      <SiteNav />
      <main className="flex flex-col">
        <Hero />
        <Credentials />
        <Manifesto />
        <Method />
        <Programmes />
        <Features />
        <TutorSection />
        <Compare />
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
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 420);
    setScrolled(latest > 24);
  });

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-40"
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div className="grain hidden bg-navy text-navy-ink sm:block">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-6 text-[11px] tracking-wide">
          <span className="text-navy-ink/70">Free for every student · Quantitative · Logical · Verbal</span>
          <span className="flex items-center gap-1.5 text-navy-ink/70">
            <Icon name="globe" className="h-3.5 w-3.5" /> Teaching in {LANGUAGES.length} languages
          </span>
        </div>
      </div>
      <div className={`border-b transition-colors duration-500 ${scrolled ? "glass border-line" : "border-transparent bg-transparent"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
          <Logo tagline />
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Sections">
            {NAV_LINKS.map(([label, href]) => (
              <a key={href} href={href} className="link-draw py-1 text-sm text-ink-soft transition-colors hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className={buttonClass("ghost", "px-3 py-2 max-sm:hidden")}>
              Sign in
            </Link>
            <Link href="/register" className={buttonClass("marker", "px-4 py-2")}>
              Enrol free
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

function SectionHeading({ eyebrow, title, text, center = false, light = false }: { eyebrow: string; title: string; text?: string; center?: boolean; light?: boolean }) {
  return (
    <div className={`flex max-w-3xl flex-col gap-4 ${center ? "mx-auto items-center text-center" : ""}`}>
      <FadeIn>
        <p className={`eyebrow ${light ? "!text-gold" : ""}`}>{eyebrow}</p>
      </FadeIn>
      <TextReveal as="h2" inView parts={[{ text: title }]} className="font-display text-4xl leading-[1.05] text-balance sm:text-[3.4rem]" />
      {text && (
        <FadeIn delay={0.15}>
          <p className={`text-lg leading-relaxed ${light ? "text-navy-ink/70" : "text-ink-soft"}`}>{text}</p>
        </FadeIn>
      )}
    </div>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-32 sm:pt-44">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />

      <motion.div style={{ y: headlineY, opacity: headlineOpacity }} className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <motion.p className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.2 }}>
            The adaptive aptitude school
          </motion.p>
          <TextReveal
            delay={0.3}
            className="mt-6 font-display text-[3.1rem] leading-[0.98] text-balance sm:text-7xl lg:text-[5.6rem]"
            parts={[{ text: "Master the aptitude round," }, { text: "one gap at a time.", className: "italic text-accent" }]}
          />
        </div>
        <motion.div
          className="flex flex-col gap-7 lg:col-span-4 lg:pb-3"
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.9 }}
        >
          <span className="h-px w-16 bg-accent" />
          <p className="text-lg leading-relaxed text-ink-soft">
            An AI teacher that works out what you don&apos;t know, teaches it in your language, and tests you again — until it sticks.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Magnetic>
              <Link href="/register" className={buttonClass("primary", "px-6 py-3.5 text-[15px]")}>
                Enrol for free <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </Magnetic>
            <a href="#method" className="link-draw py-1 text-[15px] font-medium">
              Explore the method
            </a>
          </div>
        </motion.div>
      </motion.div>

      <ProductShowcase />
    </section>
  );
}

function ProductShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const tilt = useMedia("(min-width: 1024px)");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.3"] });
  // The top edge leans away from the viewer and settles flat; nothing ever moves toward the camera, so it can't invert.
  const rotateX = useTransform(scrollYProgress, [0, 1], [tilt ? 18 : 0, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [tilt ? 0.9 : 0.97, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [40, 0]);

  return (
    <div ref={ref} className="relative mx-auto mt-20 max-w-6xl px-4 pb-24 sm:mt-28 sm:px-6 sm:pb-32" style={{ perspective: 2400 }}>
      <motion.div
        style={{ rotateX, scale, y, transformOrigin: "50% 100%" }}
        initial={{ opacity: 0, filter: "blur(12px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.6, ease: EASE, delay: 1.1 }}
      >
        <ProductPreview />
      </motion.div>
    </div>
  );
}

function ProductPreview() {
  const [gender, setGender] = useState<TutorGender>("female");
  const wide = useMedia("(min-width: 768px)");
  const name = DEFAULT_TUTOR[gender];
  const options = ["1.5 hours", "2 hours", "3 hours", "30 hours"];

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-[var(--shadow-lg)] ring-1 ring-navy/5">
      <div className="grain flex items-center gap-3 bg-navy px-4 py-2.5 text-navy-ink">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        </span>
        <span className="mx-auto flex items-center gap-1.5 rounded bg-white/10 px-3 py-1 text-xs text-navy-ink/80">
          <Icon name="lock" className="h-3 w-3" /> aptitude-teacher / practice
        </span>
        <span className="w-10" aria-hidden />
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5 p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-accent-soft px-2 py-0.5 font-medium text-accent">Re-test</span>
            <span className="rounded bg-surface-2 px-2 py-0.5 text-ink-soft">Time, Speed &amp; Distance</span>
            <span className="rounded bg-surface-2 px-2 py-0.5 text-ink-soft">Medium</span>
            <span className="ml-auto flex items-center gap-1 font-mono text-ink-soft">
              <Icon name="clock" className="h-3.5 w-3.5" /> 0:42
            </span>
          </div>
          <p className="font-display text-xl leading-snug sm:text-2xl">
            Two trains 300 km apart start moving towards each other at 70 km/h and 80 km/h. After how long do they meet?
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {options.map((option, i) => {
              const correct = i === 1;
              const wrong = i === 3;
              return (
                <motion.li
                  key={option}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: correct || wrong ? 1 : 0.55, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.1 * i }}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${
                    correct ? "border-good/50 bg-good-soft" : wrong ? "border-bad/40 bg-bad-soft" : "border-line bg-surface"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 place-items-center rounded text-xs font-medium ${
                      correct ? "bg-good text-white" : wrong ? "bg-bad text-white" : "bg-surface-2 text-ink-soft"
                    }`}
                  >
                    {correct ? <Icon name="check" className="h-3.5 w-3.5" /> : wrong ? <Icon name="x" className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  {option}
                </motion.li>
              );
            })}
          </ul>
          <div className="rounded-md border-l-2 border-accent bg-surface-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad">Concept gap</span>
              <span className="text-xs text-ink-soft">Relative speed · mastery 23% → re-teaching</span>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed">
              When trains move <strong>towards</strong> each other, the gap closes at <strong>70 + 80 = 150 km/h</strong>. So the time is{" "}
              <span className="font-mono text-[13px]">300 ÷ 150 = 2 h</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={buttonClass("marker", "px-3 py-1.5 text-xs")}>
                <Icon name="refresh" className="h-3.5 w-3.5" /> Try a similar one
              </span>
              <span className={buttonClass("secondary", "px-3 py-1.5 text-xs")}>
                <Icon name="speaker" className="h-3.5 w-3.5" /> Listen
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col border-t border-line bg-surface-2/60 md:border-l md:border-t-0">
          <div className="flex items-center justify-between px-4 pt-4">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-good" /> {name}
            </span>
            <div className="relative flex rounded-md border border-line bg-surface p-0.5 text-xs" role="radiogroup" aria-label="Preview tutor">
              {(["female", "male"] as const).map((g) => (
                <button key={g} role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className={`relative rounded px-2.5 py-1 ${gender === g ? "font-medium text-white" : "text-ink-soft"}`}>
                  {gender === g && <motion.span layoutId="preview-gender" className="absolute inset-0 rounded bg-navy" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                  <span className="relative">{DEFAULT_TUTOR[g]}</span>
                </button>
              ))}
            </div>
          </div>
          <TutorAvatar gender={gender} mood="happy" framing={wide ? "full" : "portrait"} className="mx-auto aspect-square w-44 md:aspect-[4/5] md:w-full" />
          <div className="m-4 mt-0 rounded-md border border-line bg-surface p-3 text-sm leading-relaxed">
            <span className="rounded-sm bg-marker-soft shadow-[0_0_0_2px_var(--marker-soft)]">You subtracted the speeds.</span> That works when both trains go the same
            way — here they&apos;re coming towards each other.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Credentials ---------------- */

function Credentials() {
  const stats = [
    { value: 140, suffix: "+", label: "Hand-checked questions" },
    { value: 28, suffix: "", label: "Subjects across three programmes" },
    { value: LANGUAGES.length, suffix: "", label: "Languages of instruction" },
    { value: 4, suffix: "", label: "Steps in every lesson loop" },
  ];
  const doubled = [...EXAMS, ...EXAMS];
  return (
    <section className="grain bg-navy text-navy-ink">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-10 px-4 py-16 sm:px-6 lg:grid-cols-4">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.08} className={`flex flex-col gap-2 px-2 sm:px-6 ${i ? "lg:border-l lg:border-white/10" : ""}`}>
            <span className="font-display text-5xl text-white sm:text-6xl">
              <CountOnView value={s.value} suffix={s.suffix} />
            </span>
            <span className="text-sm text-navy-ink/65">{s.label}</span>
          </FadeIn>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="marquee mx-auto flex max-w-7xl items-center overflow-hidden py-5">
          <ul className="marquee-track flex w-max items-center gap-12 pr-12">
            {doubled.map((exam, i) => (
              <li key={i} aria-hidden={i >= EXAMS.length} className="flex items-center gap-12 whitespace-nowrap font-display text-xl italic text-navy-ink/60">
                {exam}
                <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Manifesto ---------------- */

function Manifesto() {
  return (
    <section className="px-4 py-28 sm:px-6 sm:py-40">
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <p className="eyebrow mb-10">Our philosophy</p>
        </FadeIn>
        <ScrollFillText
          as="blockquote"
          className="font-display text-3xl leading-[1.25] sm:text-5xl sm:leading-[1.18]"
          text="AI shouldn't just answer questions. It should understand what you don't know, teach it, test you again — and keep adapting your path until you've truly mastered it."
        />
        <FadeIn className="mt-12 flex items-center gap-4">
          <span className="h-px w-12 bg-gold" />
          <span className="text-sm text-ink-soft">The Aptitude Teacher method</span>
        </FadeIn>
      </div>
    </section>
  );
}

/* ---------------- The method (sticky scroll story) ---------------- */

function MethodVisual({ index }: { index: number }) {
  const card = "w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-lg)]";
  if (index === 0)
    return (
      <div className={card}>
        <p className="text-xs text-ink-soft">Your answer · 30 hours · 41 seconds</p>
        <p className="mt-3 font-display text-2xl">Why was this wrong?</p>
        <div className="mt-5 flex flex-col gap-2">
          {[
            ["Careless slip", "Method right, arithmetic off", false],
            ["Concept gap", "Speeds subtracted instead of added", true],
            ["Quick guess", "Answered in under 5 seconds", false],
          ].map(([label, hint, picked]) => (
            <div key={String(label)} className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-sm ${picked ? "border-accent bg-accent-soft" : "border-line opacity-50"}`}>
              <span className="font-medium">{label}</span>
              <span className="text-xs text-ink-soft">{hint}</span>
            </div>
          ))}
        </div>
      </div>
    );
  if (index === 1)
    return (
      <div className={card}>
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <Icon name="speaker" className="h-4 w-4 text-accent" /> Asha is explaining · Relative speed
        </div>
        <p className="mt-4 font-display text-2xl leading-snug">
          <span className="rounded-sm bg-marker-soft shadow-[0_0_0_3px_var(--marker-soft)]">Moving towards each other, both close the gap together.</span> So their speeds add up.
        </p>
        <div className="mt-5 rounded-md bg-surface-2 p-3 font-mono text-sm">gap speed = 70 + 80 = 150 km/h</div>
      </div>
    );
  if (index === 2)
    return (
      <div className={card}>
        <p className="text-xs text-ink-soft">Re-test · same skill, new numbers</p>
        <p className="mt-3 font-display text-xl leading-snug">Two cyclists 90 km apart ride towards each other at 20 and 25 km/h. When do they meet?</p>
        <div className="mt-5 flex items-center gap-3 rounded-md border border-good/50 bg-good-soft px-3 py-2.5 text-sm">
          <span className="grid h-6 w-6 place-items-center rounded bg-good text-white">
            <Icon name="check" className="h-3.5 w-3.5" />
          </span>
          2 hours — correct
          <span className="ml-auto text-xs font-medium text-good">+30 XP</span>
        </div>
      </div>
    );
  return (
    <div className={card}>
      <p className="text-xs text-ink-soft">Mastery · updated just now</p>
      <div className="mt-5 flex flex-col gap-4">
        {[
          ["Relative speed", 23, 61],
          ["Syllogisms", 41, 41],
          ["Percentages", 82, 82],
        ].map(([skill, from, to]) => (
          <div key={String(skill)}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>{skill}</span>
              <span className="font-mono text-xs">{to}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className={`h-full rounded-full ${from !== to ? "bg-accent" : "bg-navy/40 dark:bg-ink/40"}`}
                initial={{ width: `${from}%` }}
                animate={{ width: `${to}%` }}
                transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm text-ink-soft">Next up: Syllogisms — your lowest skill.</p>
    </div>
  );
}

function Method() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(METHOD.length - 1, Math.max(0, Math.floor(v * METHOD.length))));
  });

  return (
    <section id="method" className="scroll-mt-20 border-t border-line bg-surface-2/50">
      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 sm:pt-32">
        <SectionHeading
          eyebrow="The method"
          title="Not a question bank. A teaching loop."
          text="Most practice sites show you the right answer and move on. Aptitude Teacher works out why you missed it — and doesn't move on until you've got it."
        />
      </div>

      {/* Desktop: pinned, scroll-driven story */}
      <div ref={ref} className="relative hidden lg:block" style={{ height: `${METHOD.length * 85}vh` }}>
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-12 items-center gap-10 px-6">
            <div className="col-span-5 flex gap-8">
              <div className="relative w-px bg-line">
                <motion.div className="absolute inset-x-0 top-0 origin-top bg-accent" style={{ scaleY: progress, height: "100%" }} />
              </div>
              <ol className="flex flex-col gap-9">
                {METHOD.map((m, i) => (
                  <li key={m.step} className={`transition-all duration-700 ${i === active ? "opacity-100" : "opacity-35"}`}>
                    <p className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-accent">0{i + 1}</span>
                      <span className="eyebrow !text-ink-soft">{m.step}</span>
                    </p>
                    <AnimatePresence initial={false}>
                      {i === active && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.7, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <p className="mt-3 font-display text-3xl leading-tight">{m.title}</p>
                          <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{m.text}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                ))}
              </ol>
            </div>
            <div className="relative col-span-7 flex min-h-[420px] items-center justify-center">
              <span aria-hidden className="pointer-events-none absolute -top-10 right-0 select-none font-display text-[16rem] leading-none text-navy/[0.05] dark:text-white/[0.04]">
                0{active + 1}
              </span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="relative flex w-full justify-center"
                  initial={{ opacity: 0, y: 40, scale: 0.96, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -30, scale: 0.98, filter: "blur(8px)" }}
                  transition={{ duration: 0.7, ease: EASE }}
                >
                  <MethodVisual index={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile and tablet: stacked chapters */}
      <ol className="mx-auto flex max-w-2xl flex-col gap-16 px-4 py-20 sm:px-6 lg:hidden">
        {METHOD.map((m, i) => (
          <FadeIn as="li" key={m.step} className="flex flex-col gap-6">
            <div>
              <p className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-accent">0{i + 1}</span>
                <span className="eyebrow !text-ink-soft">{m.step}</span>
              </p>
              <p className="mt-3 font-display text-3xl leading-tight">{m.title}</p>
              <p className="mt-3 leading-relaxed text-ink-soft">{m.text}</p>
            </div>
            <MethodVisual index={i} />
          </FadeIn>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- Programmes ---------------- */

function Programmes() {
  return (
    <section id="programmes" className="scroll-mt-20 border-t border-line px-4 py-24 sm:px-6 sm:py-36">
      <div className="mx-auto flex max-w-7xl flex-col gap-16">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading eyebrow="Programmes" title="Three programmes. Twenty-eight subjects." />
          <FadeIn delay={0.2} className="max-w-sm text-ink-soft">
            Every subject is broken into skills, and every skill has its own mastery score — so you always know exactly where you stand.
          </FadeIn>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-3">
          {PROGRAMMES.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.12} as="article" className="group relative flex flex-col bg-surface p-8 sm:p-10">
              <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-accent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
              <div className="flex items-baseline justify-between">
                <span className="font-display text-5xl italic text-accent">{p.numeral}</span>
                <span className="font-mono text-xs text-ink-soft">{p.subjects.length} subjects</span>
              </div>
              <h3 className="mt-8 font-display text-3xl">{p.name}</h3>
              <p className="mt-2 text-ink-soft">{p.blurb}</p>
              <ul className="mt-8 flex flex-col border-t border-line">
                {p.subjects.map((s) => (
                  <li key={s} className="flex items-center justify-between border-b border-line py-2.5 text-sm transition-colors duration-300 hover:text-accent">
                    {s}
                    <Icon name="chevron" className="h-3.5 w-3.5 opacity-30" />
                  </li>
                ))}
              </ul>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Features ---------------- */

function FeatureCard({ title, text, children, className = "", delay = 0 }: { title: string; text: string; children: ReactNode; className?: string; delay?: number }) {
  return (
    <FadeIn delay={delay} className={`group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow duration-700 hover:shadow-[var(--shadow-lg)] ${className}`}>
      <div className="relative flex min-h-52 flex-1 items-center justify-center overflow-hidden border-b border-line bg-surface-2/60 p-6">
        <div className="transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]">{children}</div>
      </div>
      <div className="p-6 sm:p-7">
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
      </div>
    </FadeIn>
  );
}

function Features() {
  const skills = [
    ["Percentages", 82],
    ["Time & Work", 64],
    ["Syllogisms", 41],
    ["Relative speed", 23],
  ] as const;
  const days = [3, 6, 4, 8, 5, 9, 11];

  return (
    <section className="border-t border-line bg-surface-2/50 px-4 py-24 sm:px-6 sm:py-36">
      <div className="mx-auto flex max-w-7xl flex-col gap-16">
        <SectionHeading eyebrow="Facilities" title="Everything a serious candidate needs." />

        <div className="grid gap-5 lg:grid-cols-6">
          <FeatureCard className="lg:col-span-4" title="Adaptive practice" text="Each question is chosen from your weakest or untested skills, at a difficulty that matches your mastery.">
            <ul className="flex w-[min(28rem,80vw)] flex-col gap-3.5">
              {skills.map(([skill, value], i) => (
                <li key={skill} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-ink-soft">{skill}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <motion.span
                      className={`block h-full rounded-full ${value < 35 ? "bg-accent" : value < 70 ? "bg-marker-2" : "bg-navy dark:bg-ink"}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.6, ease: EASE, delay: 0.1 * i }}
                    />
                  </span>
                  <span className="w-9 text-right font-mono text-xs">{value}%</span>
                </li>
              ))}
            </ul>
          </FeatureCard>

          <FeatureCard className="lg:col-span-2" delay={0.1} title="Mistakes, diagnosed" text="A slip, a guess and a concept gap each get a different remedy.">
            <div className="flex flex-col items-start gap-2">
              {[
                ["Careless slip", "bg-marker-soft text-marker"],
                ["Concept gap", "bg-accent-soft text-accent"],
                ["Quick guess", "bg-surface text-ink-soft"],
              ].map(([label, tone], i) => (
                <span key={label} className="float rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-[var(--shadow-sm)]" style={{ "--i": i, marginLeft: `${i * 18}px` } as CSSProperties}>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
                </span>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard className="lg:col-span-2" title="Timed mock tests" text="Fifteen questions across all three programmes with a section-wise report.">
            <div className="w-64 rounded-lg border border-line bg-surface p-4 shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between text-sm">
                <span className="font-display text-lg">Mock examination</span>
                <span className="font-mono text-xs text-ink-soft">12:48</span>
              </div>
              {[
                ["Quantitative", 4],
                ["Logical", 3],
                ["Verbal", 5],
              ].map(([section, score], i) => (
                <div key={section} className="mt-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink-soft">{section}</span>
                    <span className="font-mono">{score}/5</span>
                  </div>
                  <span className="block h-1 overflow-hidden rounded-full bg-line">
                    <motion.span
                      className="block h-full rounded-full bg-navy dark:bg-ink"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(Number(score) / 5) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, ease: EASE, delay: 0.15 * i }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard className="lg:col-span-2" delay={0.1} title="Photograph a doubt" text="Snap a question from any book and your tutor solves it step by step.">
            <div className="flex w-60 flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface p-6 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-navy-ink">
                <Icon name="camera" className="h-5 w-5" />
              </span>
              <span className="text-xs text-ink-soft">question.jpg → explained in 3 steps</span>
            </div>
          </FeatureCard>

          <FeatureCard className="lg:col-span-2" delay={0.2} title="Honours & streaks" text="Daily goals, levels and badges turn practice into a habit.">
            <div className="flex w-64 items-end gap-5">
              <div className="flex flex-col">
                <span className="font-display text-5xl">12</span>
                <span className="text-xs text-ink-soft">day streak</span>
              </div>
              <div className="flex h-20 flex-1 items-end gap-1.5" aria-hidden>
                {days.map((d, i) => (
                  <motion.span
                    key={i}
                    className={`flex-1 origin-bottom rounded-sm ${i === days.length - 1 ? "bg-accent" : "bg-navy/20 dark:bg-ink/25"}`}
                    style={{ height: `${(d / 11) * 100}%` }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: EASE, delay: 0.06 * i }}
                  />
                ))}
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Tutor ---------------- */

function TutorSection() {
  const points = [
    ["speaker", "Explains out loud", "Sentence by sentence, with the current line highlighted, lip-sync and gestures."],
    ["mic", "Interrupt any time", "Tap the mic and ask — your tutor stops and listens, like a real teacher."],
    ["globe", "In your language", `Teaches in ${LANGUAGES.length} languages, including Hindi, Tamil, Telugu, Bengali and Marathi.`],
    ["user", "Your tutor, your way", "Choose a female or male tutor and give them any name you like."],
  ];
  const doubled = [...LANGUAGES, ...LANGUAGES];

  return (
    <section id="tutor" className="scroll-mt-20 overflow-hidden border-t border-line px-4 py-24 sm:px-6 sm:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Your tutor"
            title="A personal tutor, available at midnight."
            text="Type a doubt, say it aloud, or send a photo. Your tutor explains the idea the way a good teacher would — patiently, and in your language."
          />
          <ul className="grid gap-8 sm:grid-cols-2">
            {points.map(([icon, title, text], i) => (
              <FadeIn as="li" key={title} delay={i * 0.08} className="flex flex-col gap-2 border-t border-line pt-5">
                <Icon name={icon} className="h-5 w-5 text-accent" />
                <p className="font-display text-xl">{title}</p>
                <p className="text-sm leading-relaxed text-ink-soft">{text}</p>
              </FadeIn>
            ))}
          </ul>
        </div>

        <Parallax speed={50}>
          <FadeIn className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-lg)]">
            <div className="grain flex items-center justify-between bg-navy px-5 py-3.5 text-navy-ink">
              <span className="flex items-center gap-2.5 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent font-display text-white">A</span>
                <span>
                  <span className="block font-medium text-white">Asha</span>
                  <span className="block text-xs text-navy-ink/60">Explaining · Time, Speed & Distance</span>
                </span>
              </span>
              <span className="flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-xs text-navy-ink/80">
                <Icon name="globe" className="h-3.5 w-3.5" /> हिन्दी
              </span>
            </div>
            <div className="flex flex-col gap-3 p-5 text-sm">
              <motion.p
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
                className="ml-auto max-w-[80%] rounded-lg rounded-br-sm bg-navy px-3.5 py-2.5 text-navy-ink"
              >
                Why is average speed not (x + y) / 2?
              </motion.p>
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.6 }}
                className="max-w-[88%] rounded-lg rounded-bl-sm border border-line bg-surface-2 px-3.5 py-2.5 leading-relaxed"
              >
                Because you spend <span className="rounded-sm bg-marker-soft shadow-[0_0_0_2px_var(--marker-soft)]">more time at the slower speed.</span> Average speed is total
                distance ÷ total time, so for equal distances it&apos;s 2xy / (x + y).
                <span className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
                  <Icon name="speaker" className="h-3.5 w-3.5" /> Speaking
                  <span className="ml-1 flex items-end gap-0.5" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="typing-dot h-2.5 w-0.5 rounded-full bg-accent" style={{ "--i": i } as CSSProperties} />
                    ))}
                  </span>
                </span>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: 1.1 }}
                className="ml-auto max-w-[80%] rounded-lg rounded-br-sm bg-navy px-3.5 py-2.5 text-navy-ink"
                dir="auto"
              >
                हिंदी में समझाइए
              </motion.p>
            </div>
            <div className="flex items-center gap-2 border-t border-line p-3">
              <span className="grid h-9 w-9 place-items-center rounded-md border border-line text-ink-soft">
                <Icon name="camera" className="h-4 w-4" />
              </span>
              <span className="flex-1 rounded-md border border-line px-3 py-2 text-sm text-ink-soft">Ask a doubt…</span>
              <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-white">
                <Icon name="mic" className="h-4 w-4" />
              </span>
            </div>
          </FadeIn>
        </Parallax>
      </div>

      <div className="marquee mx-auto mt-24 max-w-7xl overflow-hidden" aria-label="Languages of instruction">
        <ul className="marquee-track flex w-max gap-3 pr-3">
          {doubled.map((l, i) => (
            <li key={`${l.code}-${i}`} aria-hidden={i >= LANGUAGES.length} className="flex items-baseline gap-2 rounded-full border border-line px-5 py-2.5">
              <span dir="auto" className="font-display text-lg">
                {l.label}
              </span>
              {l.label !== l.english && <span className="text-xs text-ink-soft">{l.english}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Comparison ---------------- */

function Mark({ value }: { value: ReactNode }) {
  if (value === true) return <Icon name="check" className="mx-auto h-5 w-5 text-accent" />;
  if (value === false) return <span className="mx-auto block h-px w-4 bg-line-strong" aria-label="No" />;
  return <span className="text-sm">{value}</span>;
}

function Compare() {
  return (
    <section className="border-t border-line bg-surface-2/50 px-4 py-24 sm:px-6 sm:py-36">
      <div className="mx-auto flex max-w-4xl flex-col gap-14">
        <SectionHeading center eyebrow="Why it's different" title="More than a practice site." />
        <FadeIn className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-line text-sm">
                <th className="p-5 font-medium text-ink-soft sm:px-7">What you get</th>
                <th className="w-40 p-5 text-center font-medium text-ink-soft">Typical practice sites</th>
                <th className="grain w-44 bg-navy p-5 text-center font-display text-lg font-normal text-navy-ink">Aptitude Teacher</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, them, us]) => (
                <tr key={label} className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/60">
                  <td className="p-5 text-sm sm:px-7">{label}</td>
                  <td className="p-5 text-center text-ink-soft">
                    <Mark value={them} />
                  </td>
                  <td className="bg-accent-soft/40 p-5 text-center font-medium">
                    <Mark value={us} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FadeIn>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line px-4 py-24 sm:px-6 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading eyebrow="Admissions" title="Questions, answered." text="Anything else? Ask your tutor — that's what they're for." />
        <FadeIn className="border-t border-line">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-line">
                <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 py-6 text-left">
                  <span className={`font-display text-xl transition-colors duration-500 sm:text-2xl ${isOpen ? "text-accent" : ""}`}>{item.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.5, ease: EASE }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line">
                    <Icon name="plus" className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-6 pr-10 leading-relaxed text-ink-soft">{item.a}</p>
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

/* ---------------- Final CTA + footer ---------------- */

function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const crestY = useTransform(scrollYProgress, [0, 1], [120, -120]);
  const crestRotate = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  return (
    <section ref={ref} className="grain relative overflow-hidden bg-navy px-4 py-28 text-navy-ink sm:px-6 sm:py-40">
      <motion.div aria-hidden style={{ y: crestY, rotate: crestRotate }} className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.07]">
        <Crest className="h-[560px] w-[560px]" />
      </motion.div>
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
        <FadeIn>
          <p className="eyebrow !text-gold">Enrolment is open</p>
        </FadeIn>
        <TextReveal
          as="h2"
          inView
          className="font-display text-5xl leading-[1.02] text-white text-balance sm:text-7xl"
          parts={[{ text: "Your first lesson begins" }, { text: "in five minutes.", className: "italic text-gold" }]}
        />
        <FadeIn delay={0.2}>
          <p className="max-w-lg text-lg text-navy-ink/70">Answer a few questions and your tutor will know exactly where to begin.</p>
        </FadeIn>
        <FadeIn delay={0.3} className="flex flex-col items-center gap-4 sm:flex-row">
          <Magnetic>
            <Link href="/register" className="press shine inline-flex items-center gap-2 rounded-md bg-white px-7 py-4 text-[15px] font-medium text-navy hover:bg-navy-ink">
              Enrol for free <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </Magnetic>
          <Link href="/login" className="link-draw py-1 text-[15px] text-navy-ink/80 hover:text-white">
            I already have an account
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

function Footer() {
  const columns = [
    ["Learn", [["The method", "#method"], ["Programmes", "#programmes"], ["Your tutor", "#tutor"], ["FAQ", "#faq"]]],
    ["Account", [["Sign in", "/login"], ["Enrol free", "/register"]]],
  ] as const;
  return (
    <footer className="bg-[#00162f] text-navy-ink">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-10 pt-20 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-5">
          <Logo tagline className="text-white" />
          <p className="max-w-sm text-sm leading-relaxed text-navy-ink/60">The aptitude teacher that finds what you don&apos;t know, teaches it, and tests you again.</p>
        </div>
        {columns.map(([title, links]) => (
          <div key={title} className="flex flex-col gap-3 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">{title}</p>
            {links.map(([label, href]) =>
              href.startsWith("#") ? (
                <a key={label} href={href} className="link-draw w-fit text-navy-ink/70 hover:text-white">
                  {label}
                </a>
              ) : (
                <Link key={label} href={href} className="link-draw w-fit text-navy-ink/70 hover:text-white">
                  {label}
                </Link>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-7xl overflow-hidden px-4 sm:px-6">
        <FadeIn y={60}>
          <p aria-hidden className="select-none whitespace-nowrap font-display text-[15vw] leading-[0.85] text-white/[0.06] lg:text-[11.5rem]">
            Aptitude Teacher
          </p>
        </FadeIn>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-navy-ink/50 sm:px-6">
          <span>© {new Date().getFullYear()} Aptitude Teacher · Made in India</span>
          <span>Free for every student</span>
        </p>
      </div>
    </footer>
  );
}
