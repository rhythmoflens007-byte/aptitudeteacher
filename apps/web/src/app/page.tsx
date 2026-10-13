"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import LanguageMenu from "@/components/LanguageMenu";
import Logo from "@/components/Logo";
import { CountOnView, EASE, FadeIn, Magnetic, Orb, SmoothScroll, TextReveal } from "@/components/motion";
import PageTransition from "@/components/PageTransition";
import { ThemeToggle } from "@/components/ThemeToggle";
import TutorAvatar from "@/components/TutorAvatar";
import { Blobs, buttonClass, Icon, Ring, SparkGlow, SpotlightCard } from "@/components/ui";
import type { Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Key, LANGUAGES, translate, useT } from "@/lib/i18n";
import { DEFAULT_TUTOR, TutorGender } from "@/lib/tutor";
import type { Mood } from "@/lib/tutorRig";
import { useMedia } from "@/lib/useMedia";
import { useTutorVoice } from "@/lib/useTutorVoice";

const NAV_LINKS: [Key, string][] = [
  ["home.nav.how", "#how"],
  ["home.nav.features", "#features"],
  ["home.nav.languages", "#languages"],
  ["home.nav.faq", "#faq"],
];

const STORY = [
  { title: "home.story1.title", text: "home.story1.text", tone: "iris" },
  { title: "home.story2.title", text: "home.story2.text", tone: "coral" },
  { title: "home.story3.title", text: "home.story3.text", tone: "lagoon" },
  { title: "home.story4.title", text: "home.story4.text", tone: "sun" },
] as const satisfies readonly { title: Key; text: Key; tone: string }[];

const FAQ: [Key, Key][] = [
  ["home.faq1.q", "home.faq1.a"],
  ["home.faq2.q", "home.faq2.a"],
  ["home.faq3.q", "home.faq3.a"],
  ["home.faq4.q", "home.faq4.a"],
  ["home.faq5.q", "home.faq5.a"],
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
  const { t, locale } = useT();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => {
    setHidden(latest > (scrollY.getPrevious() ?? 0) && latest > 500);
    setScrolled(latest > 20);
  });

  return (
    <motion.header className="fixed inset-x-0 top-3 z-40 px-3" animate={{ y: hidden ? -90 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 32 }}>
      <div className={`mx-auto flex h-14 max-w-6xl items-center gap-4 rounded-full px-3 pl-4 transition-all duration-500 ${scrolled ? "glass shadow-[var(--shadow-md)] ring-1 ring-hairline" : ""}`}>
        <Logo compact />
        {/* Translated labels are longer, so their section links need a wider screen. */}
        <nav className={`hidden items-center gap-0.5 ${locale === "en" ? "xl:flex" : "2xl:flex"}`} aria-label={t("home.nav.label")}>
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">
              {t(label)}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LanguageMenu className="max-sm:[&_select]:max-w-[4.5rem]" />
          <ThemeToggle />
          <Link href="/login" className={buttonClass("ghost", "px-4 py-2 text-sm max-md:hidden")}>
            {t("auth.signIn")}
          </Link>
          <Link href="/register" className={buttonClass("primary", "px-4 py-2 text-sm max-[420px]:px-3")}>
            <span className="sm:hidden">{t("home.startShort")}</span>
            <span className="max-sm:hidden">{t("home.startFree")}</span>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

function SectionTitle({ eyebrow, title, text, center = true }: { eyebrow: string; title: ReactNode; text?: string; center?: boolean }) {
  const { locale } = useT();
  return (
    <div className={`flex max-w-3xl flex-col gap-4 ${center ? "mx-auto items-center text-center" : ""}`}>
      <FadeIn>
        <p className="eyebrow">{eyebrow}</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <h2 className={`font-display text-balance ${locale === "en" ? "text-[2.6rem] leading-[1.02] sm:text-6xl" : "text-[1.9rem] leading-[1.2] sm:text-5xl"}`}>{title}</h2>
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
  const { t, locale } = useT();
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
          className="glass press flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-medium shadow-[var(--shadow-sm)] ring-1 ring-hairline"
        >
          <span className="rounded-full bg-spark px-2.5 py-0.5 text-xs font-semibold text-white">{t("home.new")}</span>
          {t("home.meet")}
          <Icon name="chevron" className="h-3.5 w-3.5 text-ink-soft" />
        </motion.a>

        <TextReveal
          key={locale}
          delay={0.2}
          stagger={0.07}
          className={`mt-8 font-display text-balance ${
            locale === "en"
              ? "text-[3.4rem] leading-[1.02] sm:text-8xl sm:leading-[0.95] lg:text-[7.5rem]"
              : // Indian-language words are long and can't break, so the headline scales down.
                "text-[1.85rem] leading-[1.25] sm:text-6xl sm:leading-[1.15] lg:text-7xl"
          }`}
          parts={[{ text: t("home.hero1") }, { text: t("home.hero2"), className: "text-spark" }]}
        />

        <motion.p
          className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-2xl sm:leading-relaxed"
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.8 }}
        >
          {t("home.heroSub")}
        </motion.p>

        <motion.div className="mt-10 flex flex-col items-center gap-3 sm:flex-row" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 1 }}>
          <Magnetic>
            <Link href="/register" className={buttonClass("spark", "px-8 py-4 text-[17px]")}>
              {t("home.ctaStart")} <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </Magnetic>
          <a href="#how" className={buttonClass("secondary", "px-6 py-4 text-[17px]")}>
            <Icon name="play" className="h-3.5 w-3.5" /> {t("home.ctaHow")}
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
                <div className="absolute left-4 top-4 flex rounded-full bg-surface/90 p-1 text-sm shadow-[var(--shadow-sm)]" role="radiogroup" aria-label={t("home.chooseTutor")}>
                  {(["female", "male"] as const).map((g) => (
                    <button key={g} role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className={`relative rounded-full px-3.5 py-1.5 font-semibold ${gender === g ? "text-white" : "text-ink-soft"}`}>
                      {gender === g && <motion.span layoutId="hero-gender" className="absolute inset-0 rounded-full bg-iris" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                      <span className="relative">{DEFAULT_TUTOR[g]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <HeroChat key={locale} name={DEFAULT_TUTOR[gender]} gender={gender} />
            </div>
          </SparkGlow>
        </motion.div>
      </div>
    </section>
  );
}

/** A little scripted conversation that types itself out when the hero appears. */
function HeroChat({ name, gender }: { name: string; gender: TutorGender }) {
  const { t, tn } = useT();
  const lines = [
    { from: "you", text: t("home.chat1") },
    { from: "you", text: t("home.chat2") },
    { from: "tutor", text: t("home.chat3") },
    { from: "tutor", text: t("home.chat4") },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 1900 : 1300);
    return () => clearTimeout(id);
  }, [shown, lines.length]);

  return (
    <div className="flex min-h-[380px] flex-col gap-3 p-5 text-left sm:p-7" aria-label={t("home.chatLabel")}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="h-2 w-2 animate-pulse rounded-full bg-success" aria-hidden /> {name} · {tn("Time, Speed and Distance")}
      </div>
      <AnimatePresence initial={false}>
        {lines.slice(0, shown).map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className={`max-w-[88%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed ${line.from === "you" ? "ml-auto rounded-br-lg bg-iris text-white" : "rounded-bl-lg bg-surface-2 text-ink"}`}
          >
            {line.text}
          </motion.p>
        ))}
      </AnimatePresence>
      {shown < lines.length && shown >= 2 && (
        <span className="flex w-fit items-center gap-1 rounded-3xl rounded-bl-lg bg-surface-2 px-4 py-3" role="status" aria-label={t("tutor.typing", { name, gender })}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="typing-dot h-2 w-2 rounded-full bg-ink-faint" style={{ ["--i" as string]: i }} />
          ))}
        </span>
      )}
      <div aria-hidden className="mt-auto flex items-center gap-2 rounded-full bg-surface-2 p-1.5 pl-4 text-sm text-ink-faint">
        {t("home.askAnything")}
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
  const { t, tn } = useT();
  const card = "w-full max-w-md rounded-[32px] bg-surface p-7 shadow-[var(--shadow-lg)] ring-1 ring-hairline";
  if (index === 0)
    return (
      <div className={card}>
        <p className="text-sm text-ink-soft">{t("home.v1.chose")}</p>
        <p className="mt-2 font-display text-3xl">{t("home.v1.why")}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          {(
            [
              [t("mis.careless.title"), false],
              [t("home.v1.gap"), true],
              [t("mis.guess.title"), false],
            ] as const
          ).map(([label, picked], i) => (
            <motion.div
              key={label}
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
          <Icon name="speaker" className="h-4 w-4 text-coral" /> {t("home.v2.explaining", { name: DEFAULT_TUTOR.female })}
        </p>
        <p className="mt-3 font-display text-3xl leading-tight">
          <span className="rounded-xl bg-coral-soft px-1 shadow-[0_0_0_4px_var(--coral-soft)]">{t("home.v2.highlight")}</span> {t("home.v2.rest")}
        </p>
        <div className="mt-6 rounded-2xl bg-surface-2 p-4 font-mono text-sm">70 + 80 = 150 km/h</div>
      </div>
    );
  if (index === 2)
    return (
      <div className={card}>
        <p className="text-sm text-ink-soft">{t("home.v3.same")}</p>
        <p className="mt-2 font-display text-2xl leading-snug">{t("home.v3.question")}</p>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 18 }}
          className="mt-6 flex items-center gap-3 rounded-2xl bg-success-soft px-4 py-3 font-semibold text-success"
        >
          <Icon name="check" className="h-5 w-5" /> {t("home.v3.nailed")}
          <span className="ml-auto rounded-full bg-sun px-2.5 py-0.5 text-xs text-coal">+30 XP</span>
        </motion.div>
      </div>
    );
  return (
    <div className={`${card} flex items-center gap-6`}>
      <Ring value={78} size={120} stroke={14} tone="spark">
        <span className="font-display text-2xl">78%</span>
      </Ring>
      <div className="flex flex-1 flex-col gap-3">
        {(
          [
            ["Relative speed", 61, "bg-coral"],
            ["Syllogisms", 41, "bg-lagoon"],
            ["Percentages", 88, "bg-iris"],
          ] as const
        ).map(([skill, value, colour]) => (
          <div key={skill}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{tn(skill)}</span>
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
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(STORY.length - 1, Math.max(0, Math.floor(v * STORY.length)))));

  return (
    <section id="how" className="scroll-mt-20">
      <div className="px-4 pt-16 sm:pt-24">
        <SectionTitle eyebrow={t("home.how.eyebrow")} title={t("home.how.title")} text={t("home.how.text")} />
      </div>

      <div ref={ref} className="relative hidden lg:block" style={{ height: `${STORY.length * 90}vh` }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-16 px-8">
            <ol className="flex flex-col gap-8">
              {STORY.map((step, i) => {
                const on = i === active;
                const tone = TONE_CLASS[step.tone];
                return (
                  <motion.li key={step.title} animate={{ opacity: on ? 1 : 0.28, x: on ? 0 : -8 }} transition={{ duration: 0.6, ease: EASE }} aria-current={on ? "step" : undefined}>
                    <div className="flex items-center gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white ${tone.bg}`} aria-hidden>
                        {i + 1}
                      </span>
                      <h3 className="font-display text-4xl">{t(step.title)}</h3>
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
                          {t(step.text)}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ol>
            <div className="relative flex min-h-[460px] items-center justify-center">
              <motion.div aria-hidden className={`absolute h-80 w-80 rounded-full blur-3xl ${TONE_CLASS[STORY[active].tone].bg}`} animate={{ opacity: 0.28, scale: [1, 1.1, 1] }} transition={{ scale: { duration: 4, repeat: Infinity } }} />
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

      <ol className="mx-auto flex max-w-xl flex-col gap-16 px-4 py-20 lg:hidden">
        {STORY.map((step, i) => (
          <FadeIn key={step.title} className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white ${TONE_CLASS[step.tone].bg}`} aria-hidden>
                {i + 1}
              </span>
              <h3 className="font-display text-3xl">{t(step.title)}</h3>
            </div>
            <p className="text-lg text-ink-soft">{t(step.text)}</p>
            <StoryVisual index={i} />
          </FadeIn>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- Features ---------------- */

function Features() {
  const { t, tn } = useT();
  const days = [3, 6, 4, 8, 5, 9, 11];
  return (
    <section id="features" className="scroll-mt-20 px-4 py-24 sm:py-36">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <SectionTitle eyebrow={t("home.features.eyebrow")} title={t("home.features.title")} />
        <div className="grid gap-5 md:grid-cols-6">
          <FadeIn className="md:col-span-4">
            <SpotlightCard tint="iris" className="h-full p-8 sm:p-10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-iris-soft text-iris">
                <Icon name="target" className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-display text-3xl">{t("home.f1.title")}</h3>
              <p className="mt-2 max-w-md text-ink-soft">{t("home.f1.text")}</p>
              <div className="mt-8 flex flex-col gap-3">
                {(
                  [
                    ["Percentages", 88, "bg-iris"],
                    ["Time and Work", 64, "bg-lagoon"],
                    ["Syllogisms", 41, "bg-sun"],
                    ["Relative speed", 23, "bg-coral"],
                  ] as const
                ).map(([skill, value, colour], i) => (
                  <div key={skill} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 text-ink-soft">{tn(skill)}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <motion.span className={`block h-full rounded-full ${colour}`} initial={{ width: 0 }} whileInView={{ width: `${value}%` }} viewport={{ once: true }} transition={{ duration: 1.5, ease: EASE, delay: i * 0.1 }} />
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
              <h3 className="mt-6 font-display text-3xl">{t("home.f2.title")}</h3>
              <p className="mt-2 text-ink-soft">{t("home.f2.text")}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[t("mis.careless.title"), t("mis.gap.title"), t("mis.guess.title")].map((label, i) => (
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
              <h3 className="mt-6 font-display text-3xl">{t("home.f3.title")}</h3>
              <p className="mt-2 text-ink-soft">{t("home.f3.text")}</p>
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
              <h3 className="mt-6 font-display text-3xl">{t("home.f4.title")}</h3>
              <p className="mt-2 text-ink-soft">{t("home.f4.text")}</p>
              <div className="wiggle-hover mt-6 rounded-2xl border-2 border-dashed border-line-strong p-5 text-center text-sm text-ink-soft">{t("home.f4.demo")}</div>
            </SpotlightCard>
          </FadeIn>

          <FadeIn delay={0.16} className="md:col-span-2">
            <SpotlightCard tint="iris" className="h-full p-8">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-soft text-violet">
                <Icon name="flame" className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-display text-3xl">{t("home.f5.title")}</h3>
              <p className="mt-2 text-ink-soft">{t("home.f5.text")}</p>
              <div className="mt-6 flex h-20 items-end gap-1.5" aria-hidden>
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
  const { t } = useT();
  const voice = useTutorVoice();
  const [locale, setLocale] = useState<Locale>("en");
  const [gender, setGender] = useState<TutorGender>("female");
  const name = DEFAULT_TUTOR[gender];
  const tones = ["iris", "coral", "lagoon", "sun"] as const;
  const mood: Mood = voice.speaking ? "neutral" : "happy";
  // Each card greets in its own language, whatever language the page is in.
  const hello = (code: Locale) => translate(code, "tutor.hello", { name });

  function sayHello(code: Locale) {
    setLocale(code);
    voice.say(hello(code), `hello-${code}`, gender);
  }

  return (
    <section id="languages" className="relative scroll-mt-20 overflow-hidden px-4 py-24 sm:py-36">
      <Blobs className="opacity-60" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-14">
        <SectionTitle
          eyebrow={t("home.lang.eyebrow")}
          title={
            <>
              {t("home.lang.title1")} <span className="text-spark">{t("home.lang.title2")}</span>
            </>
          }
          text={t("home.lang.text")}
        />
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <FadeIn>
            <SparkGlow active={voice.speaking} className="mx-auto w-full max-w-sm rounded-[40px]">
              <div className="relative overflow-hidden rounded-[40px] bg-surface shadow-[var(--shadow-lg)]">
                <TutorAvatar gender={gender} voice={voice} mood={mood} framing="full" className="aspect-[4/5] w-full" />
                <button
                  onClick={() => {
                    voice.stop();
                    setGender(gender === "female" ? "male" : "female");
                  }}
                  className="press absolute right-4 top-4 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-sm)]"
                >
                  {t("home.lang.switch", { name: DEFAULT_TUTOR[gender === "female" ? "male" : "female"] })}
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
                    onClick={() => (on ? voice.stop() : sayHello(l.code))}
                    aria-pressed={on}
                    aria-label={`${l.english}: ${on ? t("common.stop") : t("home.lang.play")}`}
                    className={`press group relative w-full overflow-hidden rounded-[28px] bg-surface p-6 text-left shadow-[var(--shadow-md)] ring-2 transition-all duration-500 hover:shadow-[var(--shadow-lg)] ${on ? "ring-iris" : "ring-transparent"}`}
                  >
                    <span className={`absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-60 blur-2xl transition-transform duration-700 group-hover:scale-150 ${tone.bg}`} />
                    <span className="relative flex items-center justify-between">
                      <span className={`text-sm font-semibold ${tone.text}`}>{l.english}</span>
                      <span className={`grid h-10 w-10 place-items-center rounded-full text-white ${tone.bg}`}>
                        <Icon name={on ? "stop" : "speaker"} className="h-4 w-4" />
                      </span>
                    </span>
                    <span className="relative mt-4 block font-display text-4xl" lang={l.code}>
                      {l.label}
                    </span>
                    <span className="relative mt-2 block text-sm text-ink-soft" lang={l.code}>
                      {hello(l.code).split(/(?<=[.!।])\s+/).slice(0, 2).join(" ")}
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
  const { t } = useT();
  const stats = [
    { value: 1200, suffix: "+", label: t("home.num.questions"), tone: "text-iris" },
    { value: 28, suffix: "", label: t("home.num.topics"), tone: "text-coral-600" },
    { value: 4, suffix: "", label: t("home.num.languages"), tone: "text-lagoon-600" },
    { value: 100, suffix: "%", label: t("home.num.free"), tone: "text-sun-600" },
  ];
  return (
    <section className="px-4 py-12" aria-label={t("home.num.label")}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.06} className="rounded-[28px] bg-surface p-7 text-center shadow-[var(--shadow-sm)] ring-1 ring-hairline">
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
  const { t } = useT();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 px-4 py-24 sm:py-36">
      <div className="mx-auto flex max-w-3xl flex-col gap-12">
        <SectionTitle eyebrow={t("home.faq.eyebrow")} title={t("home.faq.title")} />
        <FadeIn className="flex flex-col gap-3">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div key={q} className={`rounded-[26px] bg-surface shadow-[var(--shadow-sm)] ring-1 ring-hairline transition-shadow duration-500 ${isOpen ? "shadow-[var(--shadow-md)]" : ""}`}>
                <h3>
                  <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} aria-controls={`faq-${i}`} className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left">
                    <span className="text-lg font-semibold">{t(q)}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      aria-hidden
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-300 ${isOpen ? "bg-iris text-white" : "bg-surface-2 text-ink"}`}
                    >
                      <Icon name="plus" className="h-4 w-4" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: EASE }} className="overflow-hidden">
                      <p className="px-6 pb-6 leading-relaxed text-ink-soft">{t(a)}</p>
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
  const { t, locale } = useT();
  return (
    <section className="px-4 pb-24">
      <FadeIn>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[48px] bg-spark px-6 py-24 text-center text-white sm:py-32">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.3),transparent_45%)]" />
          <motion.div aria-hidden className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/15 blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className={`font-display text-balance ${locale === "en" ? "text-5xl leading-[1.05] sm:text-7xl" : "text-[2.1rem] leading-[1.2] sm:text-6xl"}`}>{t("home.final.title")}</h2>
            <p className="max-w-lg text-lg text-white/90">{t("home.final.text")}</p>
            <Magnetic>
              <Link href="/register" className="press shine mt-2 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[17px] font-semibold text-coal shadow-[var(--shadow-lg)]">
                {t("home.ctaStart")} <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function Footer() {
  const { t } = useT();
  return (
    <footer className="px-4 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 border-t border-line pt-8 sm:flex-row">
        <Logo />
        <nav className="flex flex-wrap justify-center gap-5 text-sm text-ink-soft" aria-label={t("home.footerNav")}>
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="link-draw hover:text-ink">
              {t(label)}
            </a>
          ))}
          <Link href="/login" className="link-draw hover:text-ink">
            {t("auth.signIn")}
          </Link>
        </nav>
        <p className="text-sm text-ink-soft">{t("home.copyright", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
