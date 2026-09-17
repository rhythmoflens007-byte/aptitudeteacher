"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "./i18n";
import { detectSpeechLang, hasVoiceFor, sentenceLines, speak, stopSpeaking, Viseme, visemeFor } from "./speech";
import { TutorGender, useTutor } from "./tutor";

/** Drives the tutor's voice and everything the avatar needs to act it out. */
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
  const [sentenceText, setSentenceText] = useState("");
  const [emotion, setEmotion] = useState<string | null>(null);
  const [missingVoice, setMissingVoice] = useState<string | null>(null);

  useEffect(() => () => stopSpeaking(), []);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
    setActiveKey(null);
    setSentence(-1);
  }, []);

  /**
   * Speaks `text` sentence by sentence. `emotions` (one per sentence, from the AI) lets the tutor act out
   * the intended tone; without them the tutor reads the words themselves for cues.
   */
  const say = useCallback(
    (text: string, key = "default", gender: TutorGender = tutor.gender, emotions: string[] = []) => {
      const lang = detectSpeechLang(text, speechLang);
      const sentences = sentenceLines(text).flat();
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
            setSentenceText(sentences[index] ?? "");
            setEmotion(emotions[index] ?? null);
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

  return { speaking, viseme, word, wordTick, gestureTick, sentenceText, emotion, activeKey, sentence, missingVoice, say, stop };
}
