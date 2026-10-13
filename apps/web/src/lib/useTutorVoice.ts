"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./i18n";
import { detectSpeechLang, sentenceLines, Viseme, visemeFor } from "./speech";
import { TutorGender, useTutor } from "./tutor";
import { Speaker } from "./voice";

export type VoiceStream = { push: (sentence: string, emotion?: string | null) => void; end: () => void };

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
  const speaker = useRef<Speaker | null>(null);

  useEffect(() => () => speaker.current?.stop(), []);

  const stop = useCallback(() => {
    speaker.current?.stop();
    speaker.current = null;
    setSpeaking(false);
    setActiveKey(null);
    setSentence(-1);
  }, []);

  /** Starts a speaker whose sentences (and their emotions) are filled in by the caller. */
  const begin = useCallback(
    (key: string, gender: TutorGender, lang: string, parts: string[], emotions: (string | null)[]) => {
      speaker.current?.stop();
      setActiveKey(key);
      setSentence(-1);
      setMissingVoice(null);
      const mine = new Speaker(lang, gender, {
        onStart: () => setSpeaking(true),
        onEnd: () => {
          if (speaker.current !== mine) return;
          speaker.current = null;
          setSpeaking(false);
          setActiveKey(null);
          setSentence(-1);
        },
        onSentence: (index) => {
          setSentence(index);
          setSentenceText(parts[index] ?? "");
          setEmotion(emotions[index] ?? null);
          setGestureTick((n) => n + 1);
        },
        onWord: (spoken) => {
          setViseme(visemeFor(spoken));
          setWord(spoken);
          setWordTick((n) => n + 1);
        },
        onMissingVoice: setMissingVoice,
      });
      speaker.current = mine;
      return mine;
    },
    [],
  );

  /**
   * Speaks `text` sentence by sentence. `emotions` (one per sentence, from the AI) lets the tutor act out
   * the intended tone; without them the tutor reads the words themselves for cues.
   */
  const say = useCallback(
    (text: string, key = "default", gender: TutorGender = tutor.gender, emotions: string[] = []) => {
      const parts = sentenceLines(text).flat();
      const s = begin(key, gender, detectSpeechLang(text, speechLang), parts, emotions);
      s.push(text);
      s.end();
    },
    [begin, speechLang, tutor.gender],
  );

  /** For replies that arrive sentence by sentence: speaking starts with the first one. */
  const stream = useCallback(
    (key: string, gender: TutorGender = tutor.gender): VoiceStream => {
      const parts: string[] = [];
      const emotions: (string | null)[] = [];
      let s: Speaker | null = null;
      return {
        push(sentenceText, emotionTag = null) {
          const pieces = sentenceLines(sentenceText).flat();
          if (!pieces.length) return;
          parts.push(...pieces);
          emotions.push(...pieces.map(() => emotionTag));
          // The voice follows the script the reply is actually written in.
          s ??= begin(key, gender, detectSpeechLang(sentenceText, speechLang), parts, emotions);
          s.push(sentenceText);
        },
        end() {
          s?.end();
        },
      };
    },
    [begin, speechLang, tutor.gender],
  );

  return { speaking, viseme, word, wordTick, gestureTick, sentenceText, emotion, activeKey, sentence, missingVoice, say, stream, stop };
}
