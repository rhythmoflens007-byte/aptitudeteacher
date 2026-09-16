"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";

const LOOP = [
  { step: "Diagnose", text: "Every wrong answer is classified: careless slip, concept gap, or half-finished method." },
  { step: "Teach", text: "Concept gaps get a short lesson on that exact idea, not just the right answer." },
  { step: "Re-test", text: "A fresh question on the same skill comes back to check the gap is closed." },
  { step: "Adapt", text: "Your next questions and daily goal target the skills with the lowest mastery." },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-4 py-12">
      <section className="grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-accent">Quant · Logical · Verbal</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-balance sm:text-5xl">
            An aptitude teacher that works out what you don&apos;t know.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Practice adapts to you, mistakes get diagnosed and taught, and Asha answers your doubts by text or voice.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-accent-ink hover:brightness-110">
              Start practicing free
            </Link>
            <Link href="/login" className="rounded-lg border border-line bg-surface px-5 py-3 text-sm font-medium hover:bg-surface-2">
              Sign in
            </Link>
          </div>
        </div>
        <div className="flex justify-center">
          <Avatar speaking={false} viseme="rest" wordTick={0} mood="happy" size={260} />
        </div>
      </section>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LOOP.map((item, i) => (
          <li key={item.step} className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs font-medium text-marker tabular">Step {i + 1}</p>
            <p className="mt-1 font-display text-xl font-semibold">{item.step}</p>
            <p className="mt-2 text-sm text-ink-soft">{item.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
