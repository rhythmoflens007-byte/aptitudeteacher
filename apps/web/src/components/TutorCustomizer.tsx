"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { speak, stopSpeaking, Viseme, visemeFor } from "@/lib/speech";
import { DEFAULT_TUTOR, NAME_IDEAS, TutorGender, useTutor } from "@/lib/tutor";
import TutorAvatar from "./TutorAvatar";
import { Button, ErrorNote, Icon } from "./ui";

export default function TutorCustomizer({ onSaved }: { onSaved?: () => void }) {
  const { updateProfile } = useAuth();
  const { t, speechLang, locale } = useT();
  const current = useTutor();
  const [name, setName] = useState(current.name);
  const [gender, setGender] = useState<TutorGender>(current.gender);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [viseme, setViseme] = useState<Viseme>("rest");
  const [wordTick, setWordTick] = useState(0);

  useEffect(() => () => stopSpeaking(), []);

  function chooseGender(next: TutorGender) {
    setGender(next);
    setSaved(false);
    const other: TutorGender = next === "female" ? "male" : "female";
    if (!name.trim() || NAME_IDEAS[other].includes(name.trim())) setName(DEFAULT_TUTOR[next]);
  }

  function sayHello() {
    const shown = name.trim() || DEFAULT_TUTOR[gender];
    const greeting =
      locale === "hi"
        ? `नमस्ते! मैं ${shown} हूँ। चलिए साथ मिलकर अभ्यास करते हैं।`
        : locale === "ta"
          ? `வணக்கம்! நான் ${shown}. சேர்ந்து பயிற்சி செய்வோம்.`
          : `Hi! I'm ${shown}. Let's practise together and close your gaps one by one.`;
    speak(
      greeting,
      speechLang,
      {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onWord: (w) => {
          setViseme(visemeFor(w));
          setWordTick((n) => n + 1);
        },
      },
      gender,
    );
  }

  function stopHello() {
    stopSpeaking();
    setSpeaking(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ tutor_name: name, tutor_gender: gender });
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your tutor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col items-center gap-3">
        <TutorAvatar gender={gender} speaking={speaking} viseme={viseme} wordTick={wordTick} mood="happy" className="aspect-square w-full max-w-[280px]" />
        <p className="font-display text-2xl font-semibold">{name.trim() || DEFAULT_TUTOR[gender]}</p>
        <Button type="button" variant="secondary" onClick={speaking ? stopHello : sayHello}>
          <Icon name={speaking ? "stop" : "speaker"} className="h-4 w-4" />
          {speaking ? "Stop" : "Say hello"}
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t("tutor.gender")}</legend>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1.5" role="radiogroup">
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={gender === g}
                onClick={() => chooseGender(g)}
                className={`press rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  gender === g ? "bg-surface text-accent shadow-[var(--shadow-md)]" : "text-ink-soft hover:text-ink"
                }`}
              >
                {g === "female" ? t("tutor.female") : t("tutor.male")}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("tutor.name")}
          <input
            id="tutor-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            maxLength={30}
            required
            className="rounded-xl border border-line bg-surface px-3.5 py-3 text-base font-normal outline-none transition focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]"
          />
        </label>

        <div className="flex flex-wrap gap-2" aria-label="Name ideas">
          {NAME_IDEAS[gender].map((idea, i) => (
            <button
              key={idea}
              type="button"
              style={{ "--i": i } as React.CSSProperties}
              onClick={() => {
                setName(idea);
                setSaved(false);
              }}
              className={`pop press rounded-full border px-3 py-1 text-sm transition ${
                name === idea ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink-soft hover:border-accent/50 hover:text-ink"
              }`}
            >
              {idea}
            </button>
          ))}
        </div>

        <ErrorNote message={error} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy || !name.trim()}>
            <Icon name="sparkles" className="h-4 w-4" />
            {busy ? "Saving…" : t("tutor.save")}
          </Button>
          {saved && (
            <span className="pop flex items-center gap-1 text-sm text-good" role="status">
              <Icon name="check" className="h-4 w-4" /> {t("tutor.saved")}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
