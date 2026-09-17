"use client";

import Lenis from "lenis";
import {
  animate,
  motion,
  MotionValue,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import Crest from "./Crest";
import { MouseEvent, ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";

export const EASE = [0.16, 1, 0.3, 1] as const;

type Part = { text: string; className?: string };

/**
 * Headline that reveals word by word, each word sliding up out of a mask.
 * Pass `parts` to style some words differently (e.g. an italic accent phrase).
 */
export function TextReveal({
  parts,
  as = "h1",
  className = "",
  delay = 0,
  stagger = 0.055,
  inView = false,
}: {
  parts: Part[];
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  stagger?: number;
  inView?: boolean;
}) {
  const Tag = motion[as];
  const words = parts.flatMap((part) => part.text.split(" ").filter(Boolean).map((word) => ({ word, className: part.className })));
  const variants = {
    hidden: {},
    shown: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  const word = {
    hidden: { y: "105%", opacity: 0, rotate: 2 },
    shown: { y: "0%", opacity: 1, rotate: 0, transition: { duration: 1.1, ease: EASE } },
  };
  const trigger = inView ? { whileInView: "shown", viewport: { once: true, amount: 0.5 } } : { animate: "shown" };

  return (
    <Tag className={className} initial="hidden" variants={variants} {...trigger} aria-label={words.map((w) => w.word).join(" ")}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
          <motion.span variants={word} className={`inline-block origin-bottom-left ${w.className ?? ""}`}>
            {w.word}
          </motion.span>
          {i < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}

/** Fades, un-blurs and rises into place when scrolled into view. */
export function FadeIn({
  children,
  className = "",
  delay = 0,
  y = 28,
  as = "div",
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "li" | "article" | "span";
  once?: boolean;
}) {
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/** Moves its children at a different speed to the page while scrolling. */
export function Parallax({ children, className = "", speed = 60 }: { children: ReactNode; className?: string; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/** Element drifts gently toward the cursor, then springs back. */
export function Magnetic({ children, strength = 0.25, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 180, damping: 18, mass: 0.4 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div style={{ x: sx, y: sy }} onMouseMove={onMove} onMouseLeave={reset} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  );
}

/** Counts from zero to `value` the first time it scrolls into view. */
export function CountOnView({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!seen) return;
    const controls = animate(0, value, { duration: 2, ease: EASE, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [seen, value]);
  return (
    <span ref={ref} className={`tabular ${className}`}>
      {shown}
      {suffix}
    </span>
  );
}

function FillWord({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="inline">
      {word}{" "}
    </motion.span>
  );
}

/** A paragraph whose words light up one by one as it scrolls through the viewport. */
export function ScrollFillText({ text, className = "", as: Tag = "p" }: { text: string; className?: string; as?: "p" | "h2" | "blockquote" }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.4"] });
  const words = text.split(" ");
  return (
    <div ref={ref}>
      <Tag className={className} aria-label={text}>
        {words.map((word, i) => (
          <FillWord key={i} word={word} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
        ))}
      </Tag>
    </div>
  );
}

/** Buttery smooth wheel scrolling (Lenis) for long marketing pages. Anchor links glide too. */
export function SmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, anchors: { offset: -80 } });
    return () => lenis.destroy();
  }, [reduce]);
  return null;
}

const INTRO_KEY = "aptitude.intro.seen";
const noopSubscribe = () => () => {};
function readIntroSeen() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * First-visit title card: the crest and wordmark appear on Oxford blue,
 * then the curtain lifts to reveal the page. Plays once per browser session.
 */
export function IntroCurtain() {
  const seen = useSyncExternalStore(noopSubscribe, readIntroSeen, () => false);
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (seen || reduce) return;
    const id = window.setTimeout(() => setDone(true), 1900);
    return () => window.clearTimeout(id);
  }, [seen, reduce]);

  if (seen || reduce) return null;

  return (
    <motion.div
      aria-hidden
      className="grain fixed inset-0 z-[100] grid place-items-center bg-navy text-navy-ink"
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      animate={done ? { clipPath: "inset(0% 0% 100% 0%)" } : undefined}
      transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => {
        // Remember only after the curtain has fully lifted, so re-renders don't cut the animation short.
        if (!done) return;
        try {
          sessionStorage.setItem(INTRO_KEY, "1");
        } catch {}
      }}
      style={{ pointerEvents: done ? "none" : "auto" }}
    >
      <div className="flex flex-col items-center gap-5">
        <motion.div initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 1, ease: EASE }}>
          <Crest className="h-16 w-16" />
        </motion.div>
        <div className="overflow-hidden">
          <motion.p
            className="font-display text-3xl sm:text-4xl"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 1, ease: EASE, delay: 0.25 }}
          >
            Aptitude Teacher
          </motion.p>
        </div>
        <motion.span
          className="h-px w-40 origin-left bg-gold"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.5 }}
        />
        <motion.p
          className="text-[11px] font-semibold uppercase tracking-[0.3em] text-navy-ink/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          The adaptive aptitude school
        </motion.p>
      </div>
    </motion.div>
  );
}
