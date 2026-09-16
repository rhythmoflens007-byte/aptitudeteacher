"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import TutorAvatar from "@/components/TutorAvatar";
import { Icon } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { DEFAULT_TUTOR, TutorGender } from "@/lib/tutor";

const LOOP = [
  { step: "Diagnose", icon: "brain", text: "Every wrong answer is classified: careless slip, concept gap, or half-finished method." },
  { step: "Teach", icon: "book", text: "Concept gaps get a short lesson on that exact idea, not just the right answer." },
  { step: "Re-test", icon: "refresh", text: "A fresh question on the same skill comes back to check the gap is closed." },
  { step: "Adapt", icon: "chart", text: "Your next questions and daily goal target the skills with the lowest mastery." },
];

const FEATURES = [
  { icon: "target", title: "Adaptive practice", text: "140+ questions across Quant, Logical and Verbal that follow your weakest skills." },
  { icon: "clipboard", title: "Timed mock tests", text: "Section-wise reports show exactly where marks were lost." },
  { icon: "mic", title: "Talk it through", text: "Ask by voice, text or a photo of the question, in English, Hindi or Tamil." },
  { icon: "trophy", title: "Streaks & badges", text: "XP, levels and a daily goal keep practice a habit." },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [gender, setGender] = useState<TutorGender>("female");

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const name = DEFAULT_TUTOR[gender];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-4 pb-20 pt-6 sm:pt-10">
      <header className="rise flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-xl font-semibold">
          <Image src="/icon.svg" alt="" width={32} height={32} unoptimized />
          Aptitude Teacher
        </span>
        <Link href="/login" className="press rounded-xl px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-2 hover:text-ink">
          Sign in
        </Link>
      </header>

      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-6">
          <p className="rise inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-medium text-ink-soft" style={{ "--i": 1 } as CSSProperties}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Quant · Logical Reasoning · Verbal
          </p>
          <h1 className="rise font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl" style={{ "--i": 2 } as CSSProperties}>
            The aptitude teacher that finds <span className="text-gradient">what you don&apos;t know</span>.
          </h1>
          <p className="rise max-w-xl text-lg text-ink-soft" style={{ "--i": 3 } as CSSProperties}>
            Practice adapts to you, every mistake gets diagnosed and taught, and your own AI tutor explains doubts out loud.
          </p>
          <div className="rise flex flex-wrap gap-3" style={{ "--i": 4 } as CSSProperties}>
            <Link href="/register" className="press shine bg-brand inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-medium text-accent-ink shadow-[var(--shadow-glow)] hover:brightness-110">
              Start practising free <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link href="/login" className="press inline-flex items-center rounded-xl border border-line bg-surface px-6 py-3.5 font-medium shadow-[var(--shadow-sm)] hover:bg-surface-2">
              I have an account
            </Link>
          </div>
          <dl className="rise mt-2 grid max-w-md grid-cols-3 gap-4" style={{ "--i": 5 } as CSSProperties}>
            {[
              ["140+", "questions"],
              ["28", "subtopics"],
              ["3", "languages"],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl font-semibold tabular">{n}</dd>
                <dd className="text-sm text-ink-soft">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rise relative mx-auto w-full max-w-[520px]" style={{ "--i": 3 } as CSSProperties}>
          <TutorAvatar gender={gender} mood="happy" className="aspect-square w-full" />

          <div className="float glass absolute left-0 top-[12%] max-w-[210px] rounded-2xl rounded-bl-md border border-line px-4 py-3 text-sm shadow-[var(--shadow-lg)] sm:-left-6">
            <p className="font-medium">Why do we add the speeds?</p>
            <p className="mt-0.5 text-xs text-ink-soft">You · Time &amp; Distance</p>
          </div>
          <div
            className="float glass absolute bottom-[16%] right-0 max-w-[230px] rounded-2xl rounded-br-md border border-line px-4 py-3 text-sm shadow-[var(--shadow-lg)] sm:-right-4"
            style={{ "--i": 2 } as CSSProperties}
          >
            <p>Moving towards each other, both trains close the gap together, so their speeds add up.</p>
            <p className="mt-1 text-xs font-medium text-accent">{name} · your tutor</p>
          </div>

          <div className="absolute inset-x-0 -bottom-4 flex justify-center">
            <div className="glass flex gap-1 rounded-full border border-line p-1 shadow-[var(--shadow-md)]" role="radiogroup" aria-label="Preview tutor">
              {(["female", "male"] as const).map((g) => (
                <button
                  key={g}
                  role="radio"
                  aria-checked={gender === g}
                  onClick={() => setGender(g)}
                  className={`press rounded-full px-4 py-1.5 text-sm font-medium transition ${gender === g ? "bg-brand text-accent-ink shadow-[var(--shadow-glow)]" : "text-ink-soft hover:text-ink"}`}
                >
                  Meet {DEFAULT_TUTOR[g]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-marker">How it teaches</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-balance sm:text-4xl">A loop that closes gaps, not just a quiz.</h2>
        </div>
        <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <span aria-hidden className="absolute left-8 right-8 top-10 hidden h-px bg-gradient-to-r from-accent/0 via-accent/40 to-marker/0 lg:block" />
          {LOOP.map((item, i) => (
            <li key={item.step} className="rise lift relative rounded-3xl border border-line bg-surface/90 p-6 shadow-[var(--shadow-md)]" style={{ "--i": i } as CSSProperties}>
              <span className={`grid h-12 w-12 place-items-center rounded-2xl text-white shadow-[var(--shadow-md)] ${i % 2 ? "bg-sunrise" : "bg-brand"}`}>
                <Icon name={item.icon} className="h-6 w-6" />
              </span>
              <p className="mt-4 text-xs font-semibold text-ink-soft tabular">Step {i + 1}</p>
              <p className="font-display text-2xl font-semibold">{item.step}</p>
              <p className="mt-2 text-sm text-ink-soft">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <div key={f.title} className="rise lift flex gap-4 rounded-3xl border border-line bg-surface/90 p-6 shadow-[var(--shadow-md)]" style={{ "--i": i } as CSSProperties}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon name={f.icon} />
            </span>
            <div>
              <p className="font-medium">{f.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{f.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="rise relative overflow-hidden rounded-[2rem] bg-brand px-6 py-12 text-center text-accent-ink shadow-[var(--shadow-lg)] sm:px-12">
        <span aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <span aria-hidden className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10" />
        <h2 className="relative font-display text-3xl font-semibold text-balance sm:text-4xl">Your first diagnosis takes five minutes.</h2>
        <p className="relative mx-auto mt-3 max-w-lg opacity-90">Answer a few questions and your tutor will know exactly where to start.</p>
        <Link href="/register" className="press shine relative mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-medium text-[#0f5c42] shadow-[var(--shadow-lg)]">
          Create free account <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
