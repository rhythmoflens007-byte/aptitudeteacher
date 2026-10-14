"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { FadeIn } from "@/components/motion";
import QuestsCard from "@/components/QuestsCard";
import { buttonClass, ErrorState, Icon, PageHeader, ProgressBar, Segmented, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { Course, Lesson, Section, timeUntil, Unit } from "@/lib/game";
import { useT } from "@/lib/i18n";

const UNIT_THEMES = [
  { from: "#5b5bf5", to: "#8a55ef" },
  { from: "#ff6b5c", to: "#f5a524" },
  { from: "#14b8a6", to: "#0ea5e9" },
  { from: "#8a55ef", to: "#ff6b5c" },
  { from: "#0ea5e9", to: "#5b5bf5" },
  { from: "#f5a524", to: "#ff6b5c" },
];
// Horizontal offsets that make the path wind left and right, like a trail.
const WIND = [0, 46, 72, 46, 0, -46, -72, -46];
const SECTION_KEY = "aptitude.learnSection";

export default function LearnPage() {
  return (
    <AppShell wide>
      <Learn />
    </AppShell>
  );
}

function Learn() {
  const { t, tn, errorText } = useT();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    api<Course>("/learn/course")
      .then((c) => {
        setCourse(c);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(SECTION_KEY);
        } catch {
          /* first visit */
        }
        setSlug(c.sections.some((s) => s.slug === saved) ? saved : c.sections[0]?.slug ?? null);
      })
      .catch((e) => setError(errorText(e)));
  }, [errorText]);

  function choose(next: string) {
    setSlug(next);
    try {
      localStorage.setItem(SECTION_KEY, next);
    } catch {
      /* not remembered */
    }
  }

  if (error && !course) return <ErrorState message={error} onRetry={() => location.reload()} />;
  const section = course?.sections.find((s) => s.slug === slug);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("learn.eyebrow")}
        title={t("learn.title")}
        actions={
          course && (
            <div className="no-scrollbar -mx-4 flex max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Segmented
                id="learn-section"
                label={t("learn.section")}
                value={slug ?? ""}
                options={course.sections.map((s) => ({ value: s.slug, label: tn(s.name) }))}
                onChange={(v) => choose(v)}
              />
            </div>
          )
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>{!course || !section ? <PathSkeleton /> : <Path key={section.slug} section={section} />}</div>
        <aside className="flex flex-col gap-5 xl:sticky xl:top-8 xl:self-start">
          {course && section && <SectionCard section={section} hearts={course.hearts} max={course.max_hearts} nextHeart={course.next_heart_at} />}
          <QuestsCard />
          <Link href="/practice" className={buttonClass("secondary", "justify-center py-3")}>
            <Icon name="target" className="h-4 w-4" /> {t("learn.freePractice")}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function SectionCard({ section, hearts, max, nextHeart }: { section: Section; hearts: number; max: number; nextHeart: string | null }) {
  const { t, tn } = useT();
  const refill = timeUntil(nextHeart);
  return (
    <FadeIn>
      <div className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-md)] ring-1 ring-hairline">
        <p className="text-sm font-semibold text-ink-soft">{tn(section.name)}</p>
        <p className="mt-1 font-display text-3xl tabular">
          {section.done}
          <span className="text-lg text-ink-soft">/{section.total}</span>
        </p>
        <p className="text-xs text-ink-soft">{t("learn.lessonsDone")}</p>
        <div className="mt-3">
          <ProgressBar value={(100 * section.done) / Math.max(1, section.total)} tone="lagoon" label={t("learn.lessonsDone")} />
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-coral-soft p-3">
          <div className="flex gap-0.5" aria-hidden>
            {Array.from({ length: max }, (_, i) => (
              <Icon key={i} name="heart" className={`h-5 w-5 ${i < hearts ? "fill-coral text-coral" : "text-coral/30"}`} />
            ))}
          </div>
          <p className="min-w-0 flex-1 text-xs text-ink-soft">
            {hearts >= max ? t("game.heartsFull", { n: hearts }) : t("game.heartsRefill", { n: hearts, h: refill?.h ?? 0, m: refill?.m ?? 0 })}
          </p>
        </div>
      </div>
    </FadeIn>
  );
}

function PathSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6" aria-busy>
      <Skeleton className="h-24 w-full rounded-[28px]" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16 w-16 rounded-full" />
      ))}
    </div>
  );
}

function Path({ section }: { section: Section }) {
  const currentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    // Bring the next lesson into view, as an app would on opening the course.
    const id = setTimeout(() => currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 400);
    return () => clearTimeout(id);
  }, []);

  let index = 0;
  return (
    <div className="flex flex-col gap-10 pb-10">
      {section.units.map((unit, u) => (
        <div key={unit.id} className="flex flex-col items-center gap-6">
          <UnitBanner unit={unit} index={u} />
          <ol className="flex flex-col items-center gap-5" aria-label={unit.name}>
            {unit.lessons.map((lesson) => {
              const offset = WIND[index++ % WIND.length];
              return (
                <li key={lesson.key} style={{ transform: `translateX(${offset}px)`, zIndex: open === lesson.key ? 30 : undefined }} className="relative">
                  <Node lesson={lesson} theme={UNIT_THEMES[u % UNIT_THEMES.length]} open={open === lesson.key} onToggle={() => setOpen(open === lesson.key ? null : lesson.key)} anchorRef={lesson.state === "current" ? currentRef : undefined} />
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

function UnitBanner({ unit, index }: { unit: Unit; index: number }) {
  const { t, tn } = useT();
  const theme = UNIT_THEMES[index % UNIT_THEMES.length];
  return (
    <div className="relative w-full overflow-hidden rounded-[28px] p-5 text-white shadow-[var(--shadow-md)]" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
      <div aria-hidden className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
      <p className="relative text-xs font-bold uppercase tracking-wider text-white/80">{t("learn.unit", { n: index + 1 })}</p>
      <h2 className="relative mt-1 font-display text-2xl">{tn(unit.name)}</h2>
      <p className="relative mt-1 text-sm text-white/85 tabular">{t("learn.unitProgress", { done: unit.done, total: unit.total })}</p>
    </div>
  );
}

function Node({ lesson, theme, open, onToggle, anchorRef }: { lesson: Lesson; theme: { from: string; to: string }; open: boolean; onToggle: () => void; anchorRef?: React.Ref<HTMLDivElement> }) {
  const { t, tn } = useT();
  const router = useRouter();
  const locked = lesson.state === "locked";
  const current = lesson.state === "current";
  const checkpoint = lesson.kind === "checkpoint";
  const title = checkpoint ? t("learn.checkpoint") : `${tn(lesson.skill ?? "")}`;
  const level = checkpoint ? t("learn.checkpointNote") : t(`learn.level${lesson.level ?? 1}` as "learn.level1");
  const size = checkpoint ? "h-20 w-20" : "h-16 w-16";

  return (
    <div ref={anchorRef} className="relative flex flex-col items-center">
      {current && (
        <motion.span initial={{ y: 6, opacity: 0 }} animate={{ y: [0, -4, 0], opacity: 1 }} transition={{ y: { duration: 1.6, repeat: Infinity }, opacity: { duration: 0.3 } }} className="absolute -top-9 z-10 whitespace-nowrap rounded-xl bg-surface px-3 py-1 text-xs font-bold text-ink shadow-[var(--shadow-md)] ring-1 ring-hairline">
          {t("learn.start")}
        </motion.span>
      )}
      <motion.button
        whileHover={!locked ? { scale: 1.06 } : undefined}
        whileTap={{ scale: 0.94 }}
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${title}, ${level}, ${locked ? t("learn.locked") : lesson.state === "done" ? t("learn.doneStars", { n: lesson.stars }) : t("learn.next")}`}
        className={`relative grid ${size} place-items-center rounded-full text-white transition-shadow ${locked ? "bg-surface-2 text-ink-faint ring-1 ring-hairline" : "shadow-[0_8px_0_0_rgb(0_0_0_/_0.18)]"}`}
        style={locked ? undefined : { background: `linear-gradient(145deg, ${theme.from}, ${theme.to})` }}
      >
        {current && <span aria-hidden className="absolute -inset-2 animate-ping rounded-full opacity-30" style={{ background: theme.from }} />}
        <Icon name={locked ? "lock" : checkpoint ? "trophy" : lesson.state === "done" ? "check" : "star"} className={checkpoint ? "h-8 w-8" : "h-7 w-7"} />
      </motion.button>
      {lesson.state === "done" && (
        <span className="mt-1.5 flex gap-0.5" aria-hidden>
          {[1, 2, 3].map((s) => (
            <Icon key={s} name="star" className={`h-3.5 w-3.5 ${s <= lesson.stars ? "fill-sun text-sun" : "text-line-strong"}`} />
          ))}
        </span>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`absolute top-full z-20 mt-3 w-64 rounded-3xl p-4 shadow-[var(--shadow-lg)] ${locked ? "bg-ink text-canvas" : "text-white"}`}
            style={locked ? undefined : { background: `linear-gradient(145deg, ${theme.from}, ${theme.to})` }}
            role="dialog"
            aria-label={title}
          >
            <p className="font-display text-lg leading-snug">{title}</p>
            <p className="mt-0.5 text-sm opacity-85">{level}</p>
            {locked ? (
              <p className="mt-3 text-sm opacity-85">{t("learn.lockedNote")}</p>
            ) : (
              <button onClick={() => router.push(`/lesson?key=${encodeURIComponent(lesson.key)}`)} className="press mt-4 w-full rounded-2xl bg-white py-2.5 text-sm font-bold text-coal">
                {lesson.state === "done" ? t("learn.again") : t("learn.startLesson", { n: checkpoint ? 10 : 8 })}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
