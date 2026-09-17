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
import { MouseEvent, ReactNode, useEffect, useRef, useState } from "react";

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

/** A living gradient orb that breathes and leans toward the pointer. */
export function Orb({ className = "" }: { className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 40, damping: 16 });
  const sy = useSpring(y, { stiffness: 40, damping: 16 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      x.set((e.clientX / window.innerWidth - 0.5) * 60);
      y.set((e.clientY / window.innerHeight - 0.5) * 40);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);
  return (
    <motion.div aria-hidden style={{ x: sx, y: sy }} className={`pointer-events-none ${className}`}>
      <motion.div
        className="h-full w-full rounded-full opacity-80 blur-3xl"
        style={{ background: "conic-gradient(from 0deg, #5b5bf5, #9b5cf6, #ff6b5c, #ffc53d, #16c2c2, #5b5bf5)" }}
        animate={{ rotate: 360, scale: [1, 1.08, 0.96, 1] }}
        transition={{ rotate: { duration: 24, repeat: Infinity, ease: "linear" }, scale: { duration: 9, repeat: Infinity, ease: "easeInOut" } }}
      />
    </motion.div>
  );
}
