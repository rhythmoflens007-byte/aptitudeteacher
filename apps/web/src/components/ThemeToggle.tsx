"use client";

import { motion } from "motion/react";
import { MouseEvent, useId } from "react";
import { useT } from "@/lib/i18n";
import { ThemePreference, useTheme } from "@/lib/theme";
import { Icon } from "./ui";

const SPRING = { type: "spring", stiffness: 300, damping: 22 } as const;

function originOf(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** A sun whose rays tuck in as a crescent shadow slides over it: the moon. */
function SunMoon({ dark }: { dark: boolean }) {
  const mask = `moon-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <mask id={mask}>
        <rect width="24" height="24" fill="white" />
        <motion.circle r="7" fill="black" initial={false} animate={dark ? { cx: 17, cy: 7 } : { cx: 30, cy: -6 }} transition={SPRING} />
      </mask>
      <motion.circle cx="12" cy="12" fill="currentColor" mask={`url(#${mask})`} initial={false} animate={{ r: dark ? 8.5 : 5 }} transition={SPRING} />
      <motion.g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        initial={false}
        animate={dark ? { opacity: 0, rotate: -45, scale: 0.4 } : { opacity: 1, rotate: 0, scale: 1 }}
        transition={SPRING}
        style={{ originX: "12px", originY: "12px" }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1="12" y1="2.2" x2="12" y2="4.2" transform={`rotate(${a} 12 12)`} />
        ))}
      </motion.g>
    </svg>
  );
}

/** One-tap light/dark switch for nav bars. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setPreference } = useTheme();
  const { t } = useT();
  const dark = theme === "dark";
  const label = dark ? t("theme.toLight") : t("theme.toDark");
  return (
    <button
      type="button"
      onClick={(e) => setPreference(dark ? "light" : "dark", originOf(e))}
      aria-label={label}
      title={label}
      className={`press grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink ${className}`}
    >
      <SunMoon dark={dark} />
    </button>
  );
}

/** System / Light / Dark choice for settings. */
export function ThemePicker() {
  const { preference, setPreference } = useTheme();
  const { t } = useT();
  const options: { value: ThemePreference; icon: string; label: string }[] = [
    { value: "system", icon: "monitor", label: t("theme.system") },
    { value: "light", icon: "sun", label: t("theme.light") },
    { value: "dark", icon: "moon", label: t("theme.dark") },
  ];
  return (
    <div role="radiogroup" aria-label={t("theme.title")} className="grid grid-cols-3 gap-3 p-4">
      {options.map((o) => {
        const on = preference === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={(e) => setPreference(o.value, originOf(e))}
            className={`press relative flex flex-col items-center gap-2 rounded-3xl px-3 py-4 text-sm font-semibold ring-2 transition-colors duration-300 ${
              on ? "bg-iris-soft text-ink ring-iris" : "bg-surface-2 text-ink-soft ring-transparent hover:text-ink"
            }`}
          >
            <ThemePreview kind={o.value} />
            <span className="flex items-center gap-1.5">
              <Icon name={o.icon} className="h-4 w-4" />
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A tiny window mock-up in each theme's colours. */
function ThemePreview({ kind }: { kind: ThemePreference }) {
  const light = (
    <span className="flex h-full w-full flex-col gap-1 bg-[#fbfaf7] p-1.5">
      <span className="h-1.5 w-8 rounded-full bg-[#5b5bf5]" />
      <span className="h-1.5 w-12 rounded-full bg-[#dedbe5]" />
      <span className="mt-auto h-3 w-full rounded-md bg-white shadow-sm" />
    </span>
  );
  const dark = (
    <span className="flex h-full w-full flex-col gap-1 bg-[#0c0c11] p-1.5">
      <span className="h-1.5 w-8 rounded-full bg-[#7373fc]" />
      <span className="h-1.5 w-12 rounded-full bg-[#34343f]" />
      <span className="mt-auto h-3 w-full rounded-md bg-[#1d1d26]" />
    </span>
  );
  return (
    <span aria-hidden className="relative flex h-14 w-full overflow-hidden rounded-xl ring-1 ring-hairline">
      {kind === "dark" ? dark : kind === "light" ? light : (
        <>
          <span className="w-1/2 overflow-hidden">{light}</span>
          <span className="w-1/2 overflow-hidden">{dark}</span>
        </>
      )}
    </span>
  );
}
