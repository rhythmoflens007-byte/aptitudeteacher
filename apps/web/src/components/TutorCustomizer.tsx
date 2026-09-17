"use client";

import { CSSProperties, FormEvent, useState } from "react";
import type { Locale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { DEFAULT_TUTOR, NAME_IDEAS, TutorGender, useTutor } from "@/lib/tutor";
import { useTutorVoice } from "@/lib/useTutorVoice";
import TutorAvatar from "./TutorAvatar";
import { Button, ErrorNote, Icon, Segmented } from "./ui";

const GREETING: Record<Locale, (name: string) => string> = {
  en: (n) => `Hi! I'm ${n}. Let's practise together and close your gaps one by one.`,
  hi: (n) => `नमस्ते! मैं ${n} हूँ। चलिए साथ मिलकर अभ्यास करते हैं।`,
  bn: (n) => `নমস্কার! আমি ${n}। চলো একসাথে অনুশীলন করি।`,
  te: (n) => `నమస్కారం! నేను ${n}. కలిసి సాధన చేద్దాం.`,
  mr: (n) => `नमस्कार! मी ${n}. चला, एकत्र सराव करूया.`,
  ta: (n) => `வணக்கம்! நான் ${n}. சேர்ந்து பயிற்சி செய்வோம்.`,
  ur: (n) => `السلام علیکم! میں ${n} ہوں۔ آئیے مل کر مشق کریں۔`,
  gu: (n) => `નમસ્તે! હું ${n} છું. ચાલો સાથે મળીને અભ્યાસ કરીએ.`,
  kn: (n) => `ನಮಸ್ಕಾರ! ನಾನು ${n}. ಒಟ್ಟಿಗೆ ಅಭ್ಯಾಸ ಮಾಡೋಣ.`,
  ml: (n) => `നമസ്കാരം! ഞാൻ ${n} ആണ്. നമുക്ക് ഒരുമിച്ച് പരിശീലിക്കാം.`,
  pa: (n) => `ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ${n} ਹਾਂ। ਆਓ ਇਕੱਠੇ ਅਭਿਆਸ ਕਰੀਏ।`,
  es: (n) => `¡Hola! Soy ${n}. Practiquemos juntos.`,
  fr: (n) => `Bonjour ! Je suis ${n}. Entraînons-nous ensemble.`,
  ar: (n) => `مرحبًا! أنا ${n}. لنتدرّب معًا.`,
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
        <TutorAvatar
          gender={gender}
          speaking={voice.speaking}
          viseme={voice.viseme}
          wordTick={voice.wordTick}
          gestureTick={voice.gestureTick}
          mood="happy"
          framing="full"
          className="aspect-[4/5] w-full max-w-[260px]"
        />
        <p className="font-display text-2xl">{shownName}</p>
        <Button type="button" variant="secondary" onClick={() => (voice.speaking ? voice.stop() : voice.say(GREETING[locale](shownName), "hello", gender))}>
          <Icon name={voice.speaking ? "stop" : "speaker"} className="h-4 w-4" />
          {voice.speaking ? "Stop" : "Say hello"}
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t("tutor.gender")}</legend>
          <Segmented
            id="tutor-gender"
            label={t("tutor.gender")}
            value={gender}
            options={(["female", "male"] as const).map((g) => ({ value: g, label: g === "female" ? t("tutor.female") : t("tutor.male") }))}
            onChange={chooseGender}
          />
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
            className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base font-normal shadow-[var(--shadow-sm)] outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
        </label>

        <div className="flex flex-wrap gap-2" aria-label="Name ideas">
          {NAME_IDEAS[gender].map((idea, i) => (
            <button
              key={idea}
              type="button"
              style={{ "--i": i } as CSSProperties}
              onClick={() => {
                setName(idea);
                setSaved(false);
              }}
              className={`pop press rounded-md border px-3 py-1 text-sm ${
                name === idea ? "border-ink bg-primary text-primary-ink" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink"
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
