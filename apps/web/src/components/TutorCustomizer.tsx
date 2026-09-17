"use client";

import { motion } from "motion/react";
import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { DEFAULT_TUTOR, NAME_IDEAS, TutorGender, useTutor } from "@/lib/tutor";
import { useTutorVoice } from "@/lib/useTutorVoice";
import TutorAvatar from "./TutorAvatar";
import { Button, ErrorNote, Icon, Segmented, SparkGlow } from "./ui";

const GREETING: Record<Locale, (name: string) => string> = {
  en: (n) => `Hi! I'm ${n}. Let's learn what you don't know yet — together!`,
  hi: (n) => `नमस्ते! मैं ${n} हूँ। चलिए साथ मिलकर अभ्यास करते हैं।`,
  ta: (n) => `வணக்கம்! நான் ${n}. சேர்ந்து பயிற்சி செய்வோம்.`,
  te: (n) => `నమస్కారం! నేను ${n}. కలిసి సాధన చేద్దాం.`,
};

export default function TutorCustomizer({ onSaved }: { onSaved?: () => void }) {
  const { updateProfile } = useAuth();
  const { t, locale } = useT();
  const current = useTutor();
  const voice = useTutorVoice();
  const [name, setName] = useState(current.name);
  const [gender, setGender] = useState<TutorGender>(current.gender);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const shownName = name.trim() || DEFAULT_TUTOR[gender];

  function chooseGender(next: TutorGender) {
    voice.stop();
    setGender(next);
    setSaved(false);
    const other: TutorGender = next === "female" ? "male" : "female";
    if (!name.trim() || NAME_IDEAS[other].includes(name.trim())) setName(DEFAULT_TUTOR[next]);
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
    <form onSubmit={onSubmit} className="grid items-center gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col items-center gap-3">
        <SparkGlow active={voice.speaking} className="w-full max-w-[280px] rounded-[32px]">
          <div className="overflow-hidden rounded-[32px] bg-gradient-to-b from-iris-soft to-surface">
            <TutorAvatar gender={gender} voice={voice} mood={voice.speaking ? "neutral" : "happy"} framing="full" className="aspect-[4/5] w-full" />
          </div>
        </SparkGlow>
        <motion.p key={shownName} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl">
          {shownName}
        </motion.p>
        <Button type="button" variant="secondary" onClick={() => (voice.speaking ? voice.stop() : voice.say(GREETING[locale](shownName), "hello", gender))}>
          <Icon name={voice.speaking ? "stop" : "speaker"} className="h-4 w-4" />
          {voice.speaking ? "Stop" : "Say hello"}
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">{t("tutor.gender")}</legend>
          <Segmented
            id="tutor-gender"
            label={t("tutor.gender")}
            value={gender}
            options={(["female", "male"] as const).map((g) => ({ value: g, label: g === "female" ? t("tutor.female") : t("tutor.male") }))}
            onChange={chooseGender}
          />
        </fieldset>

        <label className="flex flex-col gap-2 text-sm font-semibold">
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
            className="rounded-2xl bg-surface-2 px-4 py-3.5 text-base font-normal outline-none ring-2 ring-transparent transition focus:bg-surface focus:ring-iris"
          />
        </label>

        <div className="flex flex-wrap gap-2" aria-label="Name ideas">
          {NAME_IDEAS[gender].map((idea, i) => (
            <motion.button
              key={`${gender}-${idea}`}
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.04 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setName(idea);
                setSaved(false);
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${name === idea ? "bg-iris text-white" : "bg-surface-2 text-ink-soft hover:text-ink"}`}
            >
              {idea}
            </motion.button>
          ))}
        </div>

        <ErrorNote message={error} />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="spark" disabled={busy || !name.trim()}>
            <Icon name="sparkles" className="h-4 w-4" />
            {busy ? "Saving…" : t("tutor.save")}
          </Button>
          {saved && (
            <span className="pop flex items-center gap-1 text-sm font-semibold text-success" role="status">
              <Icon name="check" className="h-4 w-4" /> {t("tutor.saved")}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
