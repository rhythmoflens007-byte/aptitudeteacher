"use client";

import { useEffect, useState } from "react";

type HealthStatus = { status: string; environment: string };

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError("Backend not reachable — is `uvicorn app.main:app --reload --port 8000` running?"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Aptitude Teacher</h1>
      <p className="text-zinc-500 dark:text-zinc-400">Phase 00 — infra bootstrap</p>
      <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900">
        {error && <span className="text-red-500">{error}</span>}
        {health && (
          <span className="text-green-600 dark:text-green-400">
            API status: {health.status} ({health.environment})
          </span>
        )}
        {!health && !error && <span className="text-zinc-400">Checking backend…</span>}
      </div>
    </main>
  );
}
