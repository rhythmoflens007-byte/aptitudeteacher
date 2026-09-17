"use client";

import { motion } from "motion/react";
import { ButtonHTMLAttributes, CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Variant = "primary" | "secondary" | "ghost" | "marker";

const VARIANTS: Record<Variant, string> = {
  primary: "shine bg-primary text-primary-ink shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink/40 hover:bg-surface-2",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
  marker: "shine bg-accent text-accent-ink shadow-[var(--shadow-glow)] hover:brightness-110",
};

export const BUTTON_BASE =
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium tracking-[0.01em] disabled:cursor-not-allowed disabled:opacity-50";

/** Class string for links styled as buttons. */
export function buttonClass(variant: Variant = "primary", className = "") {
  return `${BUTTON_BASE} ${VARIANTS[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

/** Consistent page title block: small eyebrow, title, optional description and actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className="font-display text-3xl sm:text-[2.6rem] sm:leading-[1.08]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Fades children in the first time they scroll into view. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--i": delay } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

export function Card({
  children,
  className = "",
  hover = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)] ${hover ? "lift" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-medium text-ink-soft">{children}</p>;
}

/** Pill-style tab group whose active indicator glides between options. */
export function Segmented<T extends string | null>({
  options,
  value,
  onChange,
  id,
  className = "",
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  id: string;
  className?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`relative flex shrink-0 gap-0.5 rounded-lg border border-line bg-surface-2 p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative flex-1 shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors duration-300 ${active ? "font-medium text-ink" : "text-ink-soft hover:text-ink"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-md border border-line bg-surface shadow-[var(--shadow-sm)]"
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              />
            )}
            <span className="relative whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Small square icon holder used on cards and stat tiles. */
export function IconTile({ name, tone = "neutral", className = "" }: { name: string; tone?: "neutral" | "accent" | "marker" | "violet"; className?: string }) {
  const tones = {
    neutral: "border border-line bg-surface-2 text-navy dark:text-ink",
    accent: "bg-accent-soft text-accent",
    marker: "bg-marker-soft text-marker",
    violet: "bg-violet/10 text-violet",
  };
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tones[tone]} ${className}`}>
      <Icon name={name} className="h-[18px] w-[18px]" />
    </span>
  );
}

export function ProgressBar({ value, tone = "accent", thick = false }: { value: number; tone?: "accent" | "marker"; thick?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`overflow-hidden rounded-full bg-surface-2 ${thick ? "h-2.5" : "h-1.5"}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`grow-x h-full rounded-full ${tone === "marker" ? "bg-marker-2" : "bg-accent"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({
  value,
  size = 88,
  stroke = 9,
  tone = "accent",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "accent" | "marker" | "bad";
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  const color = tone === "marker" ? "var(--marker-2)" : tone === "bad" ? "var(--bad)" : "var(--accent)";
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - drawn / 100)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.2, 0.8, 0.2, 1), stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = reduce ? 1 : Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function CountUp({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const shown = useCountUp(value);
  return (
    <span className="tabular">
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

const CONFETTI_COLORS = ["var(--accent)", "var(--accent-2)", "var(--marker)", "var(--marker-2)", "var(--violet)", "#f5c542"];

export function Confetti({ burst }: { burst: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: `${(i * 37 + burst * 13) % 100}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dx: `${((i * 53) % 160) - 80}px`,
        rot: `${360 + ((i * 97) % 540)}deg`,
        delay: `${(i % 9) * 0.03}s`,
        dur: `${1.2 + ((i * 7) % 8) / 10}s`,
        round: i % 3 === 0,
      })),
    [burst],
  );
  if (!burst) return null;
  return (
    <div key={burst} aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0 overflow-visible">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={
            {
              left: p.left,
              background: p.color,
              borderRadius: p.round ? "999px" : undefined,
              "--dx": p.dx,
              "--rot": p.rot,
              "--delay": p.delay,
              "--dur": p.dur,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "marker" | "accent" | "violet" }) {
  const tones = {
    neutral: "bg-surface-2 text-ink-soft",
    good: "bg-good-soft text-good",
    bad: "bg-bad-soft text-bad",
    marker: "bg-marker-soft text-marker",
    accent: "bg-accent-soft text-accent",
    violet: "bg-violet/15 text-violet",
  };
  return <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="fade flex items-start gap-2 rounded-xl border border-bad/25 bg-bad-soft px-4 py-3 text-sm text-bad">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 11h6M9 15h4" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  flame: <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .5 2 1.5 3 2.5 3-1-3 0-5.5 0-8z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5v.5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  send: <path d="M4 12 20 4l-6 16-3-7z" />,
  speaker: <path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />,
  sparkles: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" />,
  brain: <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z" />,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 13a8 8 0 0 0 14.5 4.5L20 16M4 3v5h5M20 21v-5h-5" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  play: <path d="M7 4.5v15l12-7.5z" />,
};

export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export const MISCONCEPTION_LABEL: Record<string, { title: string; hint: string }> = {
  careless_slip: { title: "Careless slip", hint: "Your method looks right — re-check calculations and read options carefully." },
  conceptual_gap: { title: "Concept gap", hint: "The underlying idea needs another look. A short lesson is below." },
  partial_method: { title: "Almost there", hint: "Right approach, but one step went off track." },
  no_attempt: { title: "Guess or skip", hint: "Take a moment to set up the problem before choosing." },
};

export const DIFFICULTY = ["", "Easy", "Easy+", "Medium", "Hard", "Expert"];
