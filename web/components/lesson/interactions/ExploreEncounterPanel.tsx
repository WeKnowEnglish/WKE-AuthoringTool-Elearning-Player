"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  resolveExploreEncounterRoll,
  type ExploreEncounterRollResult,
} from "@/lib/explore/explore-encounter-roll";
import { awardRewards } from "@/lib/progress/rewards";
import { grantWordLoot, getWordDisplayInfo } from "@/lib/word-collection";
import type { ExploreEncounter } from "@/lib/lesson-schemas";
import { unopt } from "@/components/lesson/interactions/shared";

const TIER_STYLES = {
  good: "border-amber-600 bg-amber-50 text-amber-950",
  better: "border-slate-500 bg-slate-100 text-slate-900",
  best: "border-yellow-500 bg-yellow-50 text-yellow-950",
} as const;

type Props = {
  encounter: ExploreEncounter;
  rollSeed: string;
  wordPool: string[];
  muted: boolean;
  isPreview: boolean;
  completionEventId: string;
  onComplete: () => void;
  onEconomyChange?: () => void;
  /** Fired once when encounter loot is applied (for run summary). */
  onEncounterGranted?: (roll: ExploreEncounterRollResult) => void;
  /** Full-stage encounter (no extra KidPanel chrome). */
  sceneMode?: boolean;
};

export function ExploreEncounterPanel({
  encounter,
  rollSeed,
  wordPool,
  muted,
  isPreview,
  completionEventId,
  onComplete,
  onEconomyChange,
  onEncounterGranted,
  sceneMode = false,
}: Props) {
  const roll = useMemo(
    () => resolveExploreEncounterRoll(rollSeed, wordPool),
    [rollSeed, wordPool],
  );
  const grantedRef = useRef(false);
  const [revealed, setRevealed] = useState(false);

  const wordLabels = useMemo(
    () => roll.wordIds.map((id) => getWordDisplayInfo(id).displayLabel),
    [roll.wordIds],
  );

  useEffect(() => {
    if (grantedRef.current) return;
    grantedRef.current = true;
    playSfx("correct", muted);
    queueMicrotask(() => setRevealed(true));

    if (!isPreview) {
      awardRewards({
        eventId: `${completionEventId}:encounter:${roll.tier}`,
        goldDelta: roll.gold,
        experienceDelta: 1,
      });
      for (const wordId of roll.wordIds) {
        grantWordLoot(wordId, 1);
      }
      onEncounterGranted?.(roll);
      onEconomyChange?.();
    }

    const id = window.setTimeout(() => onComplete(), 2800);
    return () => window.clearTimeout(id);
    // Roll and grant once when the encounter panel mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional single fire
  }, []);

  const tierStyle = TIER_STYLES[roll.tier];

  const inner = (
    <>
      <h2 className="text-2xl font-extrabold text-kid-ink">{encounter.title}</h2>
      {encounter.body_text ?
        <p className="text-lg text-kid-ink/90">{encounter.body_text}</p>
      : null}
      {encounter.image_url ?
        <div className="relative mx-auto aspect-[5/3] w-full max-w-md overflow-hidden rounded-xl border-4 border-kid-ink">
          <Image
            src={encounter.image_url}
            alt=""
            fill
            className="object-cover"
            unoptimized={unopt(encounter.image_url)}
          />
        </div>
      : null}

      <div
        className={clsx(
          "mx-auto w-full max-w-sm rounded-xl border-4 px-4 py-4 text-center transition-opacity duration-500",
          tierStyle,
          revealed ? "opacity-100" : "opacity-0",
        )}
        role="status"
        aria-live="polite"
      >
        <p className="text-xs font-extrabold uppercase tracking-widest opacity-80">
          Random encounter
        </p>
        <p className="mt-1 text-3xl font-extrabold">{roll.def.label}!</p>
        <p className="mt-3 text-lg font-bold">
          +{roll.gold} gold
          {roll.wordIds.length > 0 ?
            <>
              {" "}
              · +{roll.wordIds.length} word{roll.wordIds.length === 1 ? "" : "s"}
            </>
          : null}
        </p>
        {wordLabels.length > 0 ?
          <p className="mt-2 text-base font-semibold">
            {wordLabels.join(", ")}
          </p>
        : null}
        <p className="mt-3 text-sm font-semibold opacity-75">
          {isPreview ? "Preview — rewards not saved" : "Added to your Collection → Words"}
        </p>
      </div>

      <KidButton
        type="button"
        className="mx-auto mt-2"
        onClick={() => onComplete()}
      >
        Continue
      </KidButton>
    </>
  );

  if (sceneMode) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto text-center">
        {inner}
      </div>
    );
  }

  return (
    <KidPanel className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto text-center">
      {inner}
    </KidPanel>
  );
}
