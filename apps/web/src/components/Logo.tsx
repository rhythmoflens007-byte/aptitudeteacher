import Link from "next/link";
import Crest from "./Crest";

export default function Logo({
  href = "/",
  compact = false,
  tagline = false,
  className = "",
}: {
  href?: string;
  compact?: boolean;
  tagline?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`press flex shrink-0 items-center gap-2.5 ${className}`}>
      <Crest className="h-8 w-8 shrink-0" />
      <span className={`flex flex-col leading-none ${compact ? "max-sm:hidden" : ""}`}>
        <span className="font-display text-[1.15rem] tracking-tight">Aptitude Teacher</span>
        {tagline && <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.22em] opacity-60 sm:block">The adaptive aptitude school</span>}
      </span>
    </Link>
  );
}
