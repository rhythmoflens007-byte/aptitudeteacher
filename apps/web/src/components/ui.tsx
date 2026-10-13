"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import {
  ButtonHTMLAttributes,
  CSSProperties,
  MouseEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { Key, useT } from "@/lib/i18n";

/* ---------------- Buttons ---------------- */

type Variant = "primary" | "secondary" | "ghost" | "spark" | "marker";

const VARIANTS: Record<Variant, string> = {
  primary: "shine bg-iris text-white shadow-[var(--shadow-iris)] hover:bg-iris-600",
  secondary: "bg-surface text-ink shadow-[var(--shadow-sm)] ring-1 ring-line hover:ring-line-strong hover:shadow-[var(--shadow-md)]",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
  spark: "shine bg-spark text-white shadow-[0_12px_32px_-12px_rgb(155_92_246_/_0.6)] hover:shadow-[0_16px_40px_-12px_rgb(255_107_92_/_0.55)]",
  marker: "shine bg-coral text-white shadow-[0_10px_28px_-10px_rgb(255_107_92_/_0.6)] hover:bg-coral-600",
};

export const BUTTON_BASE =
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-semibold tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-50";

/** Class string for links styled as buttons. */
export function buttonClass(variant: Variant = "primary", className = "") {
  return `${BUTTON_BASE} ${VARIANTS[variant]} ${className}`;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

/* ---------------- Surfaces ---------------- */

export function Card({ children, className = "", hover = false, style }: { children: ReactNode; className?: string; hover?: boolean; style?: CSSProperties }) {
  return (
    <div style={style} className={`rounded-3xl bg-surface p-6 shadow-[var(--shadow-md)] ring-1 ring-hairline ${hover ? "lift" : ""} ${className}`}>
      {children}
    </div>
  );
}

const SPOT = { iris: "91 91 245", coral: "255 107 92", lagoon: "22 194 194", sun: "255 197 61" };

/** Card with a soft coloured spotlight that follows the pointer, and a gentle 3D tilt. */
export function SpotlightCard({
  children,
  className = "",
  tint = "iris",
  tilt = true,
}: {
  children: ReactNode;
  className?: string;
  tint?: keyof typeof SPOT;
  tilt?: boolean;
}) {
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const rx = useSpring(0, { stiffness: 160, damping: 18 });
  const ry = useSpring(0, { stiffness: 160, damping: 18 });
  const background = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, rgb(${SPOT[tint]} / 0.14), transparent 70%)`;

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mx.set(x);
    my.set(y);
    if (tilt) {
      ry.set((x / rect.width - 0.5) * 6);
      rx.set(-(y / rect.height - 0.5) * 6);
    }
  }
  function onLeave() {
    mx.set(-600);
    my.set(-600);
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      className={`group relative overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-md)] ring-1 ring-hairline transition-shadow duration-500 hover:shadow-[var(--shadow-lg)] ${className}`}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ background }} />
      {children}
    </motion.div>
  );
}

/** Wraps content in the animated Spark ring and halo while `active`. `level` (0–1) scales the halo, e.g. with speech. */
export function SparkGlow({ active, level = 1, className = "", children }: { active: boolean; level?: number; className?: string; children: ReactNode }) {
  return (
    <div data-active={active} className={`spark-glow ${className}`} style={{ "--spark-level": level } as CSSProperties}>
      {children}
    </div>
  );
}

/** Drifting colour blobs for hero backgrounds. */
export function Blobs({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`blobs ${className}`}>
      <span className="blob" style={{ width: "42vmax", height: "42vmax", left: "-12%", top: "-18%", background: "var(--blob-1)" }} />
      <span className="blob" style={{ width: "36vmax", height: "36vmax", right: "-10%", top: "-6%", background: "var(--blob-2)", animationDelay: "-6s" }} />
      <span className="blob" style={{ width: "30vmax", height: "30vmax", left: "30%", top: "34%", background: "var(--blob-3)", animationDelay: "-11s", opacity: "calc(var(--blob-opacity) * 0.75)" }} />
      <span className="blob" style={{ width: "24vmax", height: "24vmax", right: "16%", bottom: "-12%", background: "var(--blob-4)", animationDelay: "-3s", opacity: "calc(var(--blob-opacity) * 0.8)" }} />
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-semibold text-ink-soft">{children}</p>;
}

const TILE_TONES = {
  neutral: "bg-surface-2 text-ink",
  accent: "bg-iris-soft text-iris",
  iris: "bg-iris-soft text-iris",
  marker: "bg-sun-soft text-sun-600",
  sun: "bg-sun-soft text-sun-600",
  coral: "bg-coral-soft text-coral-600",
  lagoon: "bg-lagoon-soft text-lagoon-600",
  violet: "bg-violet-soft text-violet",
  good: "bg-success-soft text-success",
};

/** Rounded square icon holder used on cards and stat tiles. */
export function IconTile({ name, tone = "neutral", className = "" }: { name: string; tone?: keyof typeof TILE_TONES; className?: string }) {
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${TILE_TONES[tone]} ${className}`}>
      <Icon name={name} className="h-5 w-5" />
    </span>
  );
}

/** Pill tab group whose active indicator glides between options. */
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
    <div role="radiogroup" aria-label={label} className={`relative flex shrink-0 gap-1 rounded-full bg-surface-2 p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative flex-1 shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${active ? "text-ink" : "text-ink-soft hover:text-ink"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-surface shadow-[var(--shadow-sm)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Consistent page title: small coloured eyebrow, big bold title, optional description and actions. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[17px] text-ink-soft">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Fades children in the first time they scroll into view. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
  const MotionTag = motion[Tag] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: delay * 0.08 }}
    >
      {children}
    </MotionTag>
  );
}

/* ---------------- Data display ---------------- */

const TONE_FILL = {
  accent: "var(--iris)",
  iris: "var(--iris)",
  marker: "var(--sun)",
  sun: "var(--sun)",
  coral: "var(--coral)",
  lagoon: "var(--lagoon)",
  bad: "var(--danger)",
  good: "var(--success)",
  spark: "var(--spark)",
};
export type Tone = keyof typeof TONE_FILL;

/** With a `label` it is announced as a progress bar; without one it is decorative (the number is shown beside it). */
export function ProgressBar({ value, tone = "iris", thick = false, label }: { value: number; tone?: Tone; thick?: boolean; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const a11y = label
    ? ({ role: "progressbar", "aria-label": label, "aria-valuenow": Math.round(pct), "aria-valuemin": 0, "aria-valuemax": 100 } as const)
    : ({ "aria-hidden": true } as const);
  return (
    <div className={`overflow-hidden rounded-full bg-surface-2 ${thick ? "h-3" : "h-2"}`} {...a11y}>
      <div className="grow-x h-full rounded-full" style={{ width: `${pct}%`, background: TONE_FILL[tone] }} />
    </div>
  );
}

export function Ring({ value, size = 88, stroke = 10, tone = "iris", children }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const [drawn, setDrawn] = useState(0);
  const gid = `ring-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  const trackTint = {
    iris: "var(--iris-soft)",
    accent: "var(--iris-soft)",
    coral: "var(--coral-soft)",
    lagoon: "var(--lagoon-soft)",
    sun: "var(--sun-soft)",
    marker: "var(--sun-soft)",
    bad: "var(--danger-soft)",
    good: "var(--success-soft)",
    spark: "var(--violet-soft)",
  }[tone];
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--iris)" }} />
            <stop offset="50%" style={{ stopColor: "var(--violet)" }} />
            <stop offset="100%" style={{ stopColor: "var(--coral)" }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackTint} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone === "spark" ? `url(#${gid})` : TONE_FILL[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - drawn / 100)}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.34, 1.2, 0.64, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Three nested rings, like a fitness activity widget. */
export function ActivityRings({ rings, size = 156, children }: { rings: { value: number; tone: Tone; label: string }[]; size?: number; children?: ReactNode }) {
  const stroke = Math.round(size * 0.095);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={rings.map((r) => `${r.label} ${Math.round(r.value)}%`).join(", ")}>
      {rings.map((ring, i) => {
        const s = size - i * (stroke * 2 + 5);
        return (
          <div key={ring.label} className="absolute">
            <Ring value={ring.value} size={s} stroke={stroke} tone={ring.tone} />
          </div>
        );
      })}
      <div className="relative">{children}</div>
    </div>
  );
}

export function useCountUp(target: number, duration = 1000) {
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

const BURST_COLOURS = ["#5b5bf5", "#9b5cf6", "#ff6b5c", "#ffc53d", "#16c2c2"];

/** A playful burst of colourful particles. Increment `burst` to fire again. */
export function Confetti({ burst }: { burst: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => {
        const angle = (i / 44) * Math.PI * 2 + (burst % 7) * 0.3;
        const distance = 140 + ((i * 53 + burst * 31) % 220);
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 60,
          colour: BURST_COLOURS[i % BURST_COLOURS.length],
          size: 6 + ((i * 7) % 8),
          round: i % 3 !== 0,
          rotate: (i * 47) % 360,
        };
      }),
    [burst],
  );
  if (!burst) return null;
  return (
    <div key={burst} aria-hidden className="pointer-events-none fixed left-1/2 top-[40%] z-50 h-0 w-0">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ width: p.size, height: p.round ? p.size : p.size * 1.6, background: p.colour, borderRadius: p.round ? 999 : 2 }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 160], scale: [0, 1.2, 0.9], opacity: [1, 1, 0], rotate: p.rotate + 360 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}

type PillTone = "neutral" | "good" | "bad" | "marker" | "accent" | "violet" | "coral" | "lagoon" | "sun" | "iris";

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: PillTone }) {
  const tones: Record<PillTone, string> = {
    neutral: "bg-surface-2 text-ink-soft",
    good: "bg-success-soft text-success",
    bad: "bg-danger-soft text-danger",
    marker: "bg-sun-soft text-sun-600",
    sun: "bg-sun-soft text-sun-600",
    accent: "bg-iris-soft text-iris-600",
    iris: "bg-iris-soft text-iris-600",
    violet: "bg-violet-soft text-violet",
    coral: "bg-coral-soft text-coral-600",
    lagoon: "bg-lagoon-soft text-lagoon-600",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="shake flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

/** Full-card failure state with a way out: used when a page's main content couldn't load. */
export function ErrorState({ message, onRetry, className = "" }: { message: string; onRetry?: () => void | Promise<void>; className?: string }) {
  const { t } = useT();
  const [retrying, setRetrying] = useState(false);
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`flex flex-col items-center gap-4 rounded-[32px] bg-surface px-6 py-12 text-center shadow-[var(--shadow-md)] ring-1 ring-hairline ${className}`}
    >
      <motion.span
        animate={{ rotate: [0, -6, 6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}
        className="grid h-14 w-14 place-items-center rounded-3xl bg-coral-soft text-coral-600"
      >
        <Icon name="cloudOff" className="h-7 w-7" />
      </motion.span>
      <div className="max-w-md">
        <p className="font-display text-2xl">{t("error.title")}</p>
        <p className="mt-1 text-ink-soft">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          disabled={retrying}
          onClick={async () => {
            setRetrying(true);
            try {
              await onRetry();
            } finally {
              setRetrying(false);
            }
          }}
        >
          <Icon name="refresh" className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? t("error.retrying") : t("error.retry")}
        </Button>
      )}
    </motion.div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface-3 border-t-iris" />
      {label}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

/* ---------------- Icons ---------------- */

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
  sparkles: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
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
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  cloudOff: (
    <>
      <path d="M7 18h10.5a4 4 0 0 0 1.2-7.8A6 6 0 0 0 8.4 7.6M5.3 9.4A4.5 4.5 0 0 0 7 18" />
      <path d="M3 3l18 18" />
    </>
  ),
  wifiOff: (
    <>
      <path d="M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5a15 15 0 0 1 11.3 3.8M5 12.6a10 10 0 0 1 4-2.3M15.5 10.9A10 10 0 0 1 19 12.6M8.5 16.4a5 5 0 0 1 7 0M12 20h.01" />
      <path d="M3 3l18 18" />
    </>
  ),
  language: <path d="M4 5h9M8.5 3v2M6 5c.6 3 2.6 5.6 5.5 7M11 5c-.7 3.6-3.2 6.6-7 8M13 21l4.5-10L22 21M14.5 17.5h6" />,
};

export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export const MISCONCEPTION_KEYS = {
  careless_slip: { title: "mis.careless.title", hint: "mis.careless.hint" },
  conceptual_gap: { title: "mis.gap.title", hint: "mis.gap.hint" },
  partial_method: { title: "mis.partial.title", hint: "mis.partial.hint" },
  no_attempt: { title: "mis.guess.title", hint: "mis.guess.hint" },
} as const satisfies Record<string, { title: Key; hint: Key }>;

export const DIFFICULTY_KEYS = ["difficulty.1", "difficulty.1", "difficulty.2", "difficulty.3", "difficulty.4", "difficulty.5"] as const satisfies readonly Key[];
