"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Button, Icon } from "@/components/ui";
import { dailyReminder, download } from "@/lib/reminder";
import { useT } from "@/lib/i18n";
import { useTutor } from "@/lib/tutor";

const KEY = "aptitude.reminderTime";

function savedTime() {
  try {
    return localStorage.getItem(KEY) || "19:00";
  } catch {
    return "19:00";
  }
}

/** Picks a time and hands the phone a repeating calendar event, so the nudge arrives even with the app closed. */
export default function DailyReminder() {
  const { t } = useT();
  const tutor = useTutor();
  const toast = useToast();
  const [time, setTime] = useState(savedTime);

  function add() {
    try {
      localStorage.setItem(KEY, time);
    } catch {
      /* only the remembered time is lost */
    }
    const blob = dailyReminder(time, t("reminder.event", { name: tutor.name }), t("reminder.eventNote"), `${window.location.origin}/practice`);
    download(blob, "aptitude-daily-practice.ics");
    toast({ title: t("reminder.added"), icon: "clock", tone: "lagoon" });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
      <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lagoon-soft text-lagoon-600">
        <Icon name="clock" className="h-5 w-5" />
      </span>
      <label htmlFor="reminder-time" className="min-w-0 flex-1 text-sm font-semibold">
        {t("reminder.time")}
      </label>
      <input
        id="reminder-time"
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value || "19:00")}
        className="rounded-2xl bg-surface-2 px-3 py-2 text-[16px] tabular outline-none ring-1 ring-hairline focus-visible:ring-2 focus-visible:ring-iris"
      />
      <Button variant="primary" onClick={add} className="w-full sm:w-auto">
        {t("reminder.add")}
      </Button>
    </div>
  );
}
