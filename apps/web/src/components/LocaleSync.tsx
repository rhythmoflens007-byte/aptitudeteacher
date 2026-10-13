"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n";

/** Keeps <html lang> on the learner's language so screen readers pronounce it and fonts match. */
export default function LocaleSync() {
  const { locale } = useT();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
