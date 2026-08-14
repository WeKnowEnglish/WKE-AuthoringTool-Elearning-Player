"use client";

import { LevelUpModal } from "@/components/progress/LevelUpModal";
import { PrimaryPlayerSync } from "@/components/primary/PrimaryPlayerSync";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";

/** One student-wide host for profile sync, reward receipts, and level ceremonies. */
export function PrimaryPlayerExperience() {
  const { muted } = useAudioMuted();
  return <><PrimaryPlayerSync /><LevelUpModal muted={muted} /></>;
}
