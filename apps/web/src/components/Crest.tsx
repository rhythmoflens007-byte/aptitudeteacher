/** Shield crest used as the brand mark. Inherits colour from `currentColor` with a crimson field. */
export default function Crest({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 3 7 11v19c0 15.5 10.6 26.8 25 31 14.4-4.2 25-15.5 25-31V11z" fill="#a51c30" />
      <path d="M32 3 7 11v19c0 15.5 10.6 26.8 25 31 14.4-4.2 25-15.5 25-31V11z" fill="none" stroke="#cfae78" strokeWidth="2" />
      <path d="M32 17 17 24.5 32 32l15-7.5z" fill="#fff" />
      <path d="M23 29.5v6.5c0 3 4 5.5 9 5.5s9-2.5 9-5.5v-6.5L32 34z" fill="#fff" opacity=".82" />
      <path d="M45 25.5v10" stroke="#cfae78" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="45" cy="37.5" r="2" fill="#cfae78" />
    </svg>
  );
}
