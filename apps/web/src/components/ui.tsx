import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "marker";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
  marker: "bg-marker text-white hover:brightness-110",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">{children}</p>;
}

export function ProgressBar({ value, tone = "accent" }: { value: number; tone?: "accent" | "marker" }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${tone === "marker" ? "bg-marker" : "bg-accent"}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "marker" | "accent" }) {
  const tones = {
    neutral: "bg-surface-2 text-ink-soft",
    good: "bg-good-soft text-good",
    bad: "bg-bad-soft text-bad",
    marker: "bg-marker-soft text-marker",
    accent: "bg-accent-soft text-accent",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{message}</p>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  );
}

export const MISCONCEPTION_LABEL: Record<string, { title: string; hint: string }> = {
  careless_slip: { title: "Careless slip", hint: "Your method looks right — re-check calculations and read options carefully." },
  conceptual_gap: { title: "Concept gap", hint: "The underlying idea needs another look. A short lesson is below." },
  partial_method: { title: "Almost there", hint: "Right approach, but one step went off track." },
  no_attempt: { title: "Guess or skip", hint: "Take a moment to set up the problem before choosing." },
};

export const DIFFICULTY = ["", "Easy", "Easy+", "Medium", "Hard", "Expert"];
