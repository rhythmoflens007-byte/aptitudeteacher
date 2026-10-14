"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Button, Icon } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { Scorecard, shareScorecard } from "@/lib/scorecard";

/** A button that turns a scorecard into an image and opens the share sheet (or saves the image). */
export default function ShareScore({ card, filename, label, variant = "secondary" }: { card: () => Scorecard; filename: string; label: string; variant?: "secondary" | "primary" | "spark" }) {
  const { t } = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const outcome = await shareScorecard(card(), filename);
      if (outcome === "saved") toast({ title: t("share.saved"), icon: "check", tone: "lagoon" });
    } catch {
      toast({ title: t("share.failed"), icon: "alert", tone: "coral" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} onClick={share} disabled={busy} aria-busy={busy}>
      <Icon name="share" className="h-4 w-4" /> {busy ? t("share.making") : label}
    </Button>
  );
}
