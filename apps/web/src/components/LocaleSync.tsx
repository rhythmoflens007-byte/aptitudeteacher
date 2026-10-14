"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n";
import { registerServiceWorker } from "@/lib/install";

/** Keeps <html lang> on the learner's language so screen readers pronounce it and fonts match,
 * and registers the offline service worker once the page has loaded. */
export default function LocaleSync() {
  const { locale } = useT();
  useEffect(() => registerServiceWorker(), []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
