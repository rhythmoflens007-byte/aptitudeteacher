"use client";

import { useSyncExternalStore } from "react";
import type { Locale } from "./api";
import { ApiError } from "./api";
import { useAuth } from "./auth";
import { en } from "./locales/en";
import { hi } from "./locales/hi";
import { NAMES } from "./locales/names";
import { ta } from "./locales/ta";
import { te } from "./locales/te";

export const LANGUAGES: { code: Locale; label: string; english: string; speech: string }[] = [
  { code: "en", label: "English", english: "English", speech: "en-IN" },
  { code: "hi", label: "हिन्दी", english: "Hindi", speech: "hi-IN" },
  { code: "ta", label: "தமிழ்", english: "Tamil", speech: "ta-IN" },
  { code: "te", label: "తెలుగు", english: "Telugu", speech: "te-IN" },
];

/** Every key in the English dictionary. Keys ending in "#one" are singular forms used when n === 1. */
export type Key = keyof typeof en;
type BaseKey = Exclude<Key, `${string}#one`>;
/**
 * Other languages must translate every base key. Singular forms ("#one") are optional, and so are
 * "#male" forms for languages whose verbs change with the tutor's gender (passed as vars.gender).
 */
export type Dictionary = Record<BaseKey, string> & Partial<Record<Extract<Key, `${string}#one`>, string>> & Partial<Record<`${BaseKey}#male`, string>>;
export type Vars = Record<string, string | number>;

const DICTIONARIES: Record<Locale, Record<string, string | undefined>> = { en, hi, ta, te };
const EN: Record<string, string | undefined> = en;

export function translate(locale: Locale, key: Key, vars?: Vars): string {
  const dict = DICTIONARIES[locale] ?? EN;
  const one = vars?.n === 1;
  // Gendered form, then singular form if this language has one, else its normal form; English fills any gap.
  const text =
    (vars?.gender === "male" && dict[`${key}#male`]) || (one && dict[`${key}#one`]) || dict[key] || (one && EN[`${key}#one`]) || EN[key] || key;
  return vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : text;
}

/* Guests (landing page, sign-in) pick a language before they have an account. */
const GUEST_KEY = "aptitude.locale";
const guestListeners = new Set<() => void>();

function readGuestLocale(): Locale {
  try {
    const stored = localStorage.getItem(GUEST_KEY);
    return LANGUAGES.some((l) => l.code === stored) ? (stored as Locale) : "en";
  } catch {
    return "en";
  }
}

export function setGuestLocale(locale: Locale) {
  try {
    localStorage.setItem(GUEST_KEY, locale);
  } catch {}
  guestListeners.forEach((listener) => listener());
}

function subscribeGuest(listener: () => void) {
  guestListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    guestListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function helpersFor(locale: Locale) {
  const language = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];
  const t = (key: Key, vars?: Vars) => translate(locale, key, vars);
  return {
    locale,
    language,
    speechLang: language.speech,
    /** BCP 47 tag for dates and numbers, e.g. "ta-IN". */
    dateLocale: language.speech,
    t,
    /** Topic, subtopic, skill and badge names from the API, in the learner's language. */
    tn: (name: string, fallback: string = name) => NAMES[locale]?.[name] ?? fallback,
    /** A friendly, translated message for anything thrown by `api()`. */
    errorText: (error: unknown, fallback: Key = "error.generic") => {
      if (error instanceof ApiError) {
        if (error.kind === "offline") return t("error.offline");
        if (error.kind === "timeout") return t("error.timeout");
        if (error.kind === "server") return t("error.server");
        if (error.kind === "rate") return t("error.rate");
        if (error.message) return error.message;
      }
      return t(fallback);
    },
  };
}

const HELPERS = Object.fromEntries(LANGUAGES.map((l) => [l.code, helpersFor(l.code)])) as Record<Locale, ReturnType<typeof helpersFor>>;

/** Translation helpers for the current learner (or guest). Stable per language, so safe in effect deps. */
export function useT() {
  const { user } = useAuth();
  const guest = useSyncExternalStore(subscribeGuest, readGuestLocale, () => "en" as Locale);
  return HELPERS[user?.locale ?? guest] ?? HELPERS.en;
}
