import Link from "next/link";

/** The mark: a monoline brain with a spark, on a rounded tile in the brand gradient. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs><linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5b5bf5"/><stop offset="45%" stopColor="#9b5cf6"/><stop offset="80%" stopColor="#ff6b5c"/><stop offset="100%" stopColor="#ffc53d"/></linearGradient></defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <g fill="none" stroke="#fff" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round"><path d="M32 13.2C27.8 13.2 24.3 15.8 23.2 19.4 19 19.1 15.4 22.4 15.4 26.6c0 1.2.3 2.3.8 3.2-2.5 1.5-3.8 4.5-3 7.3.8 2.9 3.4 4.7 6.3 4.5.6 3.8 4 6.4 7.8 6 1.3 2 3 3 4.7 3.1"/><path d="M32 21.6c-3.4-.1-5.9 1.8-6.3 4.6M32 32.4c-4 0-6.7 2.3-6.8 5.6"/><g transform="translate(64,0) scale(-1,1)"><path d="M32 13.2C27.8 13.2 24.3 15.8 23.2 19.4 19 19.1 15.4 22.4 15.4 26.6c0 1.2.3 2.3.8 3.2-2.5 1.5-3.8 4.5-3 7.3.8 2.9 3.4 4.7 6.3 4.5.6 3.8 4 6.4 7.8 6 1.3 2 3 3 4.7 3.1"/><path d="M32 21.6c-3.4-.1-5.9 1.8-6.3 4.6M32 32.4c-4 0-6.7 2.3-6.8 5.6"/></g><path d="M32 13.2v37.4" strokeOpacity=".7"/></g><path d="M49.6 11.6c.7 3.9 2.3 5.5 6.4 6.5-4.1 1-5.7 2.6-6.4 6.5-.7-3.9-2.3-5.5-6.4-6.5 4.1-1 5.7-2.6 6.4-6.5z" fill="#ffc53d"/>
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
