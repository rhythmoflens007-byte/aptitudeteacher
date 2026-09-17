import Link from "next/link";

/** The Spark mark: a rounded tile in the brand gradient with a four-point spark. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5b5bf5" />
          <stop offset="45%" stopColor="#9b5cf6" />
          <stop offset="80%" stopColor="#ff6b5c" />
          <stop offset="100%" stopColor="#ffc53d" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#logo-spark)" />
      <path d="M32 12c1.6 9.4 5.6 13.6 16 16-10.4 2.4-14.4 6.6-16 16-1.6-9.4-5.6-13.6-16-16 10.4-2.4 14.4-6.6 16-16z" fill="#fff" />
      <circle cx="46" cy="44" r="4" fill="#fff" opacity="0.85" />
    </svg>
  );
}

export default function Logo({ href = "/", compact = false, className = "" }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={`press flex shrink-0 items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className={`text-[17px] font-bold tracking-[-0.03em] ${compact ? "max-sm:hidden" : ""}`}>Aptitude Teacher</span>
    </Link>
  );
}
