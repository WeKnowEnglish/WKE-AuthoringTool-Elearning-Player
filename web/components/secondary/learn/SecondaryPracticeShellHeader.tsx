"use client";

import { usePathname } from "next/navigation";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

const ACTIVITY_LABELS: Record<string, string> = {
  "/secondary": "Home",
  "/secondary/match": "Match",
  "/secondary/cloze": "Cloze",
  "/secondary/spelling": "Spelling",
  "/secondary/sentence": "Sentence",
};

export function SecondaryPracticeShellHeader() {
  const pathname = usePathname();
  const activityLabel = ACTIVITY_LABELS[pathname ?? ""] ?? null;

  return (
    <header className="mb-4 rounded-xl border-2 border-kid-ink bg-kid-panel px-5 py-4">
      <p className={`${secondaryUi.eyebrow} text-kid-ink/60`}>Lower secondary</p>
      <h1 className={secondaryUi.pageTitle}>
        Vocabulary Practice
        {activityLabel && activityLabel !== "Home" ? (
          <span className="text-kid-ink/70"> · {activityLabel}</span>
        ) : null}
      </h1>
    </header>
  );
}
