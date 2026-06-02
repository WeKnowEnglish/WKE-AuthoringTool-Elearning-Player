"use client";

import Image from "next/image";
import { useEffect } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, unlockSpeechSynthesis } from "@/lib/audio/tts";
import {
  getExploreScene,
  getNextSceneId,
  isSceneUnlocked,
} from "@/lib/explore/scenes/registry";
import type { ExploreSceneEndingDef } from "@/lib/explore/scenes/types";
import type { ExploreRunCompleteResult } from "@/lib/explore/record-explore-run-complete";
import { unopt } from "@/components/lesson/interactions/shared";

type Props = {
  ending: ExploreSceneEndingDef;
  result: ExploreRunCompleteResult;
  sceneId: string;
  muted: boolean;
  onPlayAgain: () => void;
  onReturnHome: () => void;
  onOpenWords?: () => void;
};

export function ExploreSceneComplete({
  ending,
  result,
  sceneId,
  muted,
  onPlayAgain,
  onReturnHome,
  onOpenWords,
}: Props) {
  const nextSceneId = getNextSceneId(sceneId as "home_help_brother");
  const nextSceneTitle =
    nextSceneId ? getExploreScene(nextSceneId).title : null;
  const nextUnlocked = nextSceneId ? isSceneUnlocked(nextSceneId) : false;

  useEffect(() => {
    unlockSpeechSynthesis();
    const text = ending.read_aloud_text?.trim() || ending.body_text;
    void speakText(text, { lang: "en-US", muted });
  }, [ending, muted]);

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <KidPanel className="max-h-[90dvh] w-full max-w-md overflow-y-auto text-center">
        <h2 className="text-2xl font-extrabold text-kid-ink">{ending.title}</h2>
        {ending.image_url ?
          <div className="relative mx-auto mt-3 aspect-[2/1] w-full overflow-hidden rounded-xl border-4 border-kid-ink">
            <Image
              src={ending.image_url}
              alt=""
              fill
              className="object-cover"
              sizes="400px"
              unoptimized={unopt(ending.image_url)}
            />
          </div>
        : null}
        <p className="mt-3 text-base font-semibold text-kid-ink/90">{ending.body_text}</p>

        <ul className="mt-4 space-y-2 text-left text-sm font-semibold text-kid-ink">
          {result.experienceDelta > 0 ?
            <li>+{result.experienceDelta} XP</li>
          : null}
          <li>
            Area progress: {result.areaDiscoveredCount}/{result.areaTotalCount} words (
            {result.areaPercent}%)
          </li>
        </ul>

        {result.areaJustCompleted ?
          <p className="mt-4 rounded-xl border-4 border-emerald-700 bg-emerald-50 px-3 py-2 text-base font-bold text-emerald-950">
            You found every word in this area!
            {result.nextAreaTitle ?
              <> {result.nextAreaTitle} is now unlocked.</>
            : null}
          </p>
        : (
          <p className="mt-4 text-sm font-semibold text-kid-ink/80">
            Replay to find any words you missed.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {nextSceneTitle ?
            <KidButton
              type="button"
              variant="secondary"
              className="w-full opacity-60"
              disabled={!nextUnlocked}
              onClick={() => {
                if (!nextUnlocked) playSfx("wrong", muted);
              }}
            >
              {nextUnlocked ?
                `Next scene: ${nextSceneTitle}`
              : `Next scene: ${nextSceneTitle} (coming soon)`}
            </KidButton>
          : null}
          <KidButton type="button" variant="accent" onClick={onPlayAgain}>
            Play again
          </KidButton>
          {onOpenWords ?
            <KidButton type="button" variant="secondary" onClick={onOpenWords}>
              Collection → Words
            </KidButton>
          : null}
          <KidButton type="button" variant="secondary" onClick={onReturnHome}>
            Return home
          </KidButton>
        </div>
      </KidPanel>
    </div>
  );
}
