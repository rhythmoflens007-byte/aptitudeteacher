import Image from "next/image";
import Link from "next/link";

export default function Logo({ href = "/", compact = false, className = "" }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={`press flex shrink-0 items-center gap-2.5 font-semibold tracking-tight ${className}`}>
      <Image src="/icon.svg" alt="" width={28} height={28} unoptimized className="rounded-[7px]" />
      <span className={compact ? "hidden sm:inline" : ""}>Aptitude Teacher</span>
    </Link>
  );
}
