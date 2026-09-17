"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "./i18n";
import { detectSpeechLang, hasVoiceFor, speak, stopSpeaking, Viseme, visemeFor } from "./speech";
import { TutorGender, useTutor } from "./tutor";

/** Drives the tutor's voice and the avatar state that follows it. */
export function useTutorVoice() {
  const { speechLang } = useT();
  const tutor = useTutor();
  const [speaking, setSpeaking] = useState(false);
  const [viseme, setViseme] = useState<Viseme>("rest");
  const [word, setWord] = useState("");
  const [wordTick, setWordTick] = useState(0);
  const [gestureTick, setGestureTick] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [sentence, setSentence] = useState(-1);
  const [missingVoice, setMissingVoice] = useState<string | null>(null);

  useEffect(() => () => stopSpeaking(), []);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
    setActiveKey(null);
    setSentence(-1);
  }, []);

  const say = useCallback(
    (text: string, key = "default", gender: TutorGender = tutor.gender) => {
      const lang = detectSpeechLang(text, speechLang);
      hasVoiceFor(lang).then((ok) => setMissingVoice(ok ? null : lang));
      setActiveKey(key);
      setSentence(-1);
      speak(
        text,
        lang,
        {
          onStart: () => setSpeaking(true),
          onEnd: () => {
            setSpeaking(false);
            setActiveKey(null);
            setSentence(-1);
          },
          onSentence: (index) => {
            setSentence(index);
            setGestureTick((n) => n + 1);
          },
          onWord: (spoken) => {
            setViseme(visemeFor(spoken));
            setWord(spoken);
            setWordTick((n) => n + 1);
          },
        },
        gender,
      );
    },
    [speechLang, tutor.gender],
  );

  return { speaking, viseme, word, wordTick, gestureTick, activeKey, sentence, missingVoice, say, stop };
}
