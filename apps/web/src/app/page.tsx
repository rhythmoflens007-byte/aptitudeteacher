"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import Logo from "@/components/Logo";
import TutorAvatar from "@/components/TutorAvatar";
import { buttonClass, Icon, Reveal } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/i18n";
import { DEFAULT_TUTOR, TutorGender } from "@/lib/tutor";
import { useMedia } from "@/lib/useMedia";

const NAV_LINKS = [
  ["How it works", "#how"],
  ["Features", "#features"],
  ["Tutor", "#tutor"],
  ["FAQ", "#faq"],
] as const;

const EXAMS = ["Campus placements", "Bank PO & Clerk", "SSC CGL", "CAT-style Quant", "Company assessments", "Railway exams"];

const LOOP = [
  { step: "Diagnose", icon: "brain", text: "Every wrong answer is classified — careless slip, concept gap, or a method that went off track." },
  { step: "Teach", icon: "book", text: "Concept gaps get a short lesson on that exact idea, explained out loud by your tutor." },
  { step: "Re-test", icon: "refresh", text: "A fresh question on the same skill comes back to confirm the gap is really closed." },
  { step: "Adapt", icon: "chart", text: "Your next questions and daily goal shift to the skills with the lowest mastery." },
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
    q: "Which exams does it help with?",
    a: "Any test with an aptitude section: campus placement tests, company online assessments, bank and SSC exams, and CAT-style quantitative and reasoning practice.",
  },
  {
    q: "How does it know what I don't understand?",
    a: "It looks at which answer you chose, how long you took and the skill behind the question. A quick guess, a calculation slip and a real concept gap each get a different response — and each skill has its own mastery score.",
  },
  {
    q: "Which languages can the tutor speak?",
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
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="flex flex-col">
        <Hero />
        <ExamStrip />
        <HowItWorks />
        <Features />
        <TutorSection />
        <Compare />
        <Numbers />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-colors ${scrolled ? "glass border-b border-line" : "border-b border-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="rounded-md px-3 py-1.5 text-sm text-ink-soft transition hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className={buttonClass("ghost", "px-3 py-2 max-sm:hidden")}>
            Sign in
          </Link>
          <Link href="/register" className={buttonClass("primary", "px-3.5 py-2")}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function SectionHeading({ eyebrow, title, text, center = false }: { eyebrow: string; title: ReactNode; text?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={`flex max-w-2xl flex-col gap-3 ${center ? "mx-auto items-center text-center" : ""}`}>
      <p className="text-sm font-medium text-accent">{eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold text-balance sm:text-[2.6rem] sm:leading-[1.1]">{title}</h2>
      {text && <p className="text-base text-ink-soft sm:text-lg">{text}</p>}
    </Reveal>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -top-16" />
      <div aria-hidden className="bg-glow pointer-events-none absolute inset-0 -top-16" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20">
        <a
          href="#tutor"
          className="rise group inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm text-ink-soft shadow-[var(--shadow-sm)] transition hover:border-line-strong hover:text-ink"
        >
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">New</span>
          AI tutor that speaks {LANGUAGES.length} languages
          <Icon name="chevron" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </a>

        <h1
          className="rise mt-6 max-w-4xl font-display text-[2.6rem] font-semibold leading-[1.04] text-balance sm:text-6xl lg:text-7xl"
          style={{ "--i": 1 } as CSSProperties}
        >
          <span className="text-gradient">Aptitude prep that finds what you don&apos;t know.</span>{" "}
          <span className="text-accent-gradient">Then teaches it.</span>
        </h1>

        <p className="rise mt-6 max-w-2xl text-lg text-ink-soft sm:text-xl" style={{ "--i": 2 } as CSSProperties}>
          Adaptive practice for Quantitative, Logical Reasoning and Verbal. Every mistake is diagnosed, explained by your own AI tutor, and tested
          again until it sticks.
        </p>

        <div className="rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ "--i": 3 } as CSSProperties}>
          <Link href="/register" className={buttonClass("primary", "px-5 py-3 text-[15px]")}>
            Start practising free <Icon name="arrow" className="h-4 w-4" />
          </Link>
          <a href="#how" className={buttonClass("secondary", "px-5 py-3 text-[15px]")}>
            <Icon name="play" className="h-3.5 w-3.5" /> See how it works
          </a>
        </div>

        <p className="rise mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-ink-soft" style={{ "--i": 4 } as CSSProperties}>
          {["Free forever", "No card needed", "English, हिन्दी, தமிழ் + 11 more"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <Icon name="check" className="h-4 w-4 text-accent" /> {item}
            </span>
          ))}
        </p>

        <div className="rise mt-14 w-full" style={{ "--i": 5 } as CSSProperties}>
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  const [gender, setGender] = useState<TutorGender>("female");
  const wide = useMedia("(min-width: 768px)");
  const name = DEFAULT_TUTOR[gender];
  const options = ["1.5 hours", "2 hours", "3 hours", "30 hours"];

  return (
    <div className="frame-glow mx-auto max-w-5xl rounded-2xl bg-surface p-1.5 text-left shadow-[var(--shadow-lg)]">
      <div className="overflow-hidden rounded-xl border border-line bg-paper">
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="mx-auto flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1 text-xs text-ink-soft">
            <Icon name="lock" className="h-3 w-3" /> aptitude-teacher / practice
          </span>
          <span className="w-10" aria-hidden />
        </div>

        <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
          {/* question */}
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-marker-soft px-2 py-0.5 font-medium text-marker">Re-test</span>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-ink-soft">Time, Speed &amp; Distance</span>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-ink-soft">Medium</span>
              <span className="ml-auto flex items-center gap-1 text-ink-soft tabular">
                <Icon name="clock" className="h-3.5 w-3.5" /> 0:42
              </span>
            </div>
            <p className="text-[15px] leading-relaxed sm:text-base">
              Two trains 300 km apart start moving towards each other at 70 km/h and 80 km/h. After how long do they meet?
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {options.map((option, i) => {
                const correct = i === 1;
                const wrong = i === 3;
                return (
                  <li
                    key={option}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                      correct ? "border-good/50 bg-good-soft" : wrong ? "border-bad/40 bg-bad-soft" : "border-line bg-surface opacity-60"
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-md text-xs font-medium ${
                        correct ? "bg-good text-accent-ink" : wrong ? "bg-bad text-white" : "bg-surface-2 text-ink-soft"
                      }`}
                    >
                      {correct ? <Icon name="check" className="h-3.5 w-3.5" /> : wrong ? <Icon name="x" className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    {option}
                  </li>
                );
              })}
            </ul>
            <div className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad">Concept gap</span>
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

          {/* tutor */}
          <div className="flex flex-col border-t border-line bg-surface md:border-l md:border-t-0">
            <div className="flex items-center justify-between px-4 pt-4">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full bg-good" /> {name}
              </span>
              <div className="flex rounded-md border border-line p-0.5 text-xs" role="radiogroup" aria-label="Preview tutor">
                {(["female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    role="radio"
                    aria-checked={gender === g}
                    onClick={() => setGender(g)}
                    className={`press rounded px-2 py-1 ${gender === g ? "bg-surface-2 font-medium text-ink" : "text-ink-soft"}`}
                  >
                    {DEFAULT_TUTOR[g]}
                  </button>
                ))}
              </div>
            </div>
            <TutorAvatar gender={gender} mood="happy" framing={wide ? "full" : "portrait"} className="mx-auto aspect-square w-44 md:aspect-[4/5] md:w-full" />
            <div className="m-4 mt-0 rounded-lg border border-line bg-paper p-3 text-sm leading-relaxed">
              <span className="rounded bg-marker-soft shadow-[0_0_0_2px_var(--marker-soft)]">You subtracted the speeds.</span> That works when both
              trains go the same way — here they&apos;re coming towards each other.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamStrip() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:px-6 md:flex-row md:gap-10">
        <p className="shrink-0 text-sm text-ink-soft">Built for the aptitude rounds in</p>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:justify-between md:flex-1">
          {EXAMS.map((exam) => (
            <li key={exam} className="text-[15px] font-semibold tracking-tight text-ink/60">
              {exam}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <SectionHeading
          eyebrow="How it teaches"
          title="Not a question bank. A teaching loop."
          text="Most practice sites show you the right answer and move on. Aptitude Teacher works out why you missed it, and doesn't move on until you've got it."
        />
        <ol className="relative grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((item, i) => (
            <Reveal as="li" key={item.step} delay={i} className="flex flex-col gap-4 bg-surface p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-2">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs text-ink-soft">0{i + 1}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{item.step}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.text}</p>
              </div>
              {i < LOOP.length - 1 && (
                <span aria-hidden className="mt-auto flex items-center gap-2 text-xs text-ink-soft">
                  <span className="h-px flex-1 bg-line" /> then
                </span>
              )}
              {i === LOOP.length - 1 && (
                <span aria-hidden className="mt-auto flex items-center gap-2 text-xs text-accent">
                  <span className="h-px flex-1 bg-accent/30" /> repeat
                </span>
              )}
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Bento features ---------------- */

function BentoCard({ title, text, children, className = "", delay = 0 }: { title: string; text: string; children: ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-line-strong ${className}`}>
      <div className="relative flex min-h-44 flex-1 items-center justify-center border-b border-line bg-paper p-6">{children}</div>
      <div className="p-6">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{text}</p>
      </div>
    </Reveal>
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
    <section id="features" className="scroll-mt-16 border-t border-line bg-surface/50 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to crack the aptitude round."
          text="140+ hand-checked questions across 28 subtopics, organised by skill so progress means something."
        />

        <div className="grid gap-4 lg:grid-cols-6">
          <BentoCard
            className="lg:col-span-4"
            title="Adaptive practice"
            text="Each question is chosen from your weakest or untested skills, at a difficulty that matches your mastery."
          >
            <ul className="flex w-full max-w-md flex-col gap-3">
              {skills.map(([skill, value], i) => (
                <li key={skill} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-ink-soft">{skill}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className={`block h-full rounded-full transition-[width] duration-1000 ${value < 35 ? "bg-bad" : value < 70 ? "bg-marker-2" : "bg-accent"}`}
                      style={{ width: `${value}%`, transitionDelay: `${i * 80}ms` }}
                    />
                  </span>
                  <span className="w-9 text-right font-mono text-xs tabular">{value}%</span>
                  <span className={`w-14 text-right text-[11px] font-medium ${i === 3 ? "text-accent" : "text-transparent"}`}>Next up</span>
                </li>
              ))}
            </ul>
          </BentoCard>

          <BentoCard className="lg:col-span-2" delay={1} title="Mistakes, diagnosed" text="A slip, a guess and a concept gap each get a different fix.">
            <div className="flex flex-col items-start gap-2">
              {[
                ["Careless slip", "bg-marker-soft text-marker", "re-check the calculation"],
                ["Concept gap", "bg-bad-soft text-bad", "short lesson + re-test"],
                ["Quick guess", "bg-surface-2 text-ink-soft", "set it up first"],
              ].map(([label, tone, fix], i) => (
                <span key={label} className="float flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-[var(--shadow-sm)]" style={{ "--i": i } as CSSProperties}>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
                  <span className="text-xs text-ink-soft">{fix}</span>
                </span>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="lg:col-span-2" delay={0} title="Timed mock tests" text="15 questions across all three sections with a section-wise report.">
            <div className="w-full max-w-xs rounded-lg border border-line bg-surface p-4 shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Mock test</span>
                <span className="flex items-center gap-1 font-mono text-xs text-ink-soft">
                  <Icon name="clock" className="h-3.5 w-3.5" /> 12:48
                </span>
              </div>
              {[
                ["Quant", 4],
                ["Logical", 3],
                ["Verbal", 5],
              ].map(([section, score]) => (
                <div key={section} className="mt-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink-soft">{section}</span>
                    <span className="font-mono tabular">{score}/5</span>
                  </div>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(Number(score) / 5) * 100}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="lg:col-span-2" delay={1} title="Snap a photo of a doubt" text="Photograph a question from any book and your tutor solves it step by step.">
            <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface p-5 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon name="camera" className="h-5 w-5" />
              </span>
              <span className="text-xs text-ink-soft">question.jpg → explained in 3 steps</span>
            </div>
          </BentoCard>

          <BentoCard className="lg:col-span-2" delay={2} title="Streaks, XP & badges" text="A daily goal, levels and badges keep practice a habit.">
            <div className="flex w-full max-w-xs items-end gap-4">
              <div className="flex flex-col">
                <span className="flame text-2xl" aria-hidden>
                  🔥
                </span>
                <span className="font-display text-3xl font-semibold tabular">12</span>
                <span className="text-xs text-ink-soft">day streak</span>
              </div>
              <div className="flex h-20 flex-1 items-end gap-1.5" aria-hidden>
                {days.map((d, i) => (
                  <span key={i} className={`flex-1 rounded-sm ${i === days.length - 1 ? "bg-accent" : "bg-accent/25"}`} style={{ height: `${(d / 11) * 100}%` }} />
                ))}
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Tutor ---------------- */

function TutorSection() {
  const points = [
    ["speaker", "Explains out loud", "Sentence by sentence, with the current line highlighted, lip-sync and hand gestures."],
    ["mic", "Interrupt any time", "Tap the mic and ask — the tutor stops and listens, just like a real teacher."],
    ["globe", "In your language", `Replies and speaks in ${LANGUAGES.length} languages, including Hindi, Tamil, Telugu, Bengali and Marathi.`],
    ["user", "Your tutor, your way", "Pick a female or male tutor and give them any name you like."],
  ];
  const doubled = [...LANGUAGES, ...LANGUAGES];

  return (
    <section id="tutor" className="scroll-mt-16 overflow-hidden border-t border-line px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="AI tutor"
            title="A teacher who talks you through it."
            text="Stuck on a doubt at midnight? Type it, say it, or send a photo. Your tutor explains the idea the way a good teacher would."
          />
          <ul className="grid gap-6 sm:grid-cols-2">
            {points.map(([icon, title, text], i) => (
              <Reveal as="li" key={title} delay={i} className="flex flex-col gap-2">
                <Icon name={icon} className="h-5 w-5 text-accent" />
                <p className="font-medium">{title}</p>
                <p className="text-sm leading-relaxed text-ink-soft">{text}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={1} className="relative">
          <div aria-hidden className="bg-glow absolute -inset-10" />
          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">A</span>
                Asha
                <span className="text-xs font-normal text-ink-soft">· explaining</span>
              </span>
              <span className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-soft">
                <Icon name="globe" className="h-3.5 w-3.5" /> हिन्दी
              </span>
            </div>
            <div className="flex flex-col gap-3 p-4 text-sm">
              <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-primary-ink">
                Why is average speed not (x + y) / 2?
              </p>
              <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-line bg-paper px-3.5 py-2.5 leading-relaxed">
                Because you spend <span className="rounded bg-marker-soft shadow-[0_0_0_2px_var(--marker-soft)]">more time at the slower speed.</span> Average
                speed is total distance ÷ total time, so for equal distances it&apos;s 2xy / (x + y).
                <span className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
                  <Icon name="speaker" className="h-3.5 w-3.5" /> Speaking…
                  <span className="ml-1 flex items-end gap-0.5" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="typing-dot h-2.5 w-0.5 rounded-full bg-accent" style={{ "--i": i } as CSSProperties} />
                    ))}
                  </span>
                </span>
              </div>
              <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-primary-ink" dir="auto">
                हिंदी में समझाइए
              </p>
            </div>
            <div className="flex items-center gap-2 border-t border-line p-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft">
                <Icon name="camera" className="h-4 w-4" />
              </span>
              <span className="flex-1 rounded-lg border border-line px-3 py-2 text-sm text-ink-soft">Ask a doubt…</span>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-ink">
                <Icon name="mic" className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Reveal>
      </div>

      <div id="languages" className="marquee mx-auto mt-20 max-w-6xl overflow-hidden" aria-label="Supported languages">
        <ul className="marquee-track flex w-max gap-3">
          {doubled.map((l, i) => (
            <li key={`${l.code}-${i}`} aria-hidden={i >= LANGUAGES.length} className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm">
              <span dir="auto" className="font-medium">
                {l.label}
              </span>
              {l.label !== l.english && <span className="text-ink-soft">{l.english}</span>}
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
    <section className="border-t border-line bg-surface/50 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto flex max-w-4xl flex-col gap-12">
        <SectionHeading center eyebrow="Why it's different" title="More than a practice site." />
        <Reveal className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-line text-sm">
                <th className="p-4 font-medium text-ink-soft sm:px-6">What you get</th>
                <th className="w-40 p-4 text-center font-medium text-ink-soft">Typical practice sites</th>
                <th className="w-40 bg-accent-soft/60 p-4 text-center font-semibold">Aptitude Teacher</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, them, us]) => (
                <tr key={label} className="border-b border-line last:border-0">
                  <td className="p-4 text-sm sm:px-6">{label}</td>
                  <td className="p-4 text-center text-ink-soft">
                    <Mark value={them} />
                  </td>
                  <td className="bg-accent-soft/60 p-4 text-center font-medium">
                    <Mark value={us} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}

function Numbers() {
  const stats = [
    ["140+", "hand-checked questions"],
    ["28", "subtopics across 3 sections"],
    [String(LANGUAGES.length), "tutor languages"],
    ["8", "badges to earn"],
  ];
  return (
    <section className="border-t border-line px-4 py-16 sm:px-6">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-8 lg:grid-cols-4">
        {stats.map(([n, label], i) => (
          <Reveal key={label} delay={i} className="flex flex-col gap-1 border-l border-line pl-5">
            <dt className="sr-only">{label}</dt>
            <dd className="font-display text-4xl font-semibold tabular sm:text-5xl">{n}</dd>
            <dd className="text-sm text-ink-soft">{label}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

/* ---------------- FAQ + CTA + footer ---------------- */

function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t border-line px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." text="Anything else? Ask your tutor — that's what they're for." />
        <Reveal className="divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
                {item.q}
                <Icon name="plus" className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="fade pb-5 pr-8 text-sm leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0b] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
        <div aria-hidden className="absolute inset-0 [background-image:linear-gradient(rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgb(52_211_153/0.22),transparent_70%)]" />
        <div className="relative flex flex-col items-center gap-5">
          <h2 className="max-w-2xl font-display text-3xl font-semibold text-balance sm:text-5xl">Your first diagnosis takes five minutes.</h2>
          <p className="max-w-lg text-white/65">Answer a few questions and your tutor will know exactly where to start.</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="press inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-[15px] font-medium text-[#0a0a0b] hover:bg-white/90">
              Create free account <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link href="/login" className="press inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-[15px] font-medium text-white/85 hover:bg-white/5 hover:text-white">
              I already have an account
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const columns = [
    ["Product", [["How it works", "#how"], ["Features", "#features"], ["AI tutor", "#tutor"], ["FAQ", "#faq"]]],
    ["Account", [["Sign in", "/login"], ["Create account", "/register"]]],
  ] as const;
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-soft">The aptitude teacher that finds what you don&apos;t know, teaches it, and tests you again.</p>
        </div>
        {columns.map(([title, links]) => (
          <div key={title} className="flex flex-col gap-3 text-sm">
            <p className="font-medium">{title}</p>
            {links.map(([label, href]) =>
              href.startsWith("#") ? (
                <a key={label} href={href} className="text-ink-soft transition hover:text-ink">
                  {label}
                </a>
              ) : (
                <Link key={label} href={href} className="text-ink-soft transition hover:text-ink">
                  {label}
                </Link>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-soft sm:px-6">© {new Date().getFullYear()} Aptitude Teacher · Made in India</p>
      </div>
    </footer>
  );
}
