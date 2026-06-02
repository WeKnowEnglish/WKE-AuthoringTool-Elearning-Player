"use client";

import { useEffect } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText } from "@/lib/audio/tts";
import type { ExploreSceneInteractTarget } from "@/lib/explore/explore-scene-engine";
import { getWordDisplayInfo } from "@/lib/word-collection";

type Props = {
  target: ExploreSceneInteractTarget;
  muted: boolean;
  onCollect: () => void;
  onClose: () => void;
};

export function ExploreScenePickupPanel({
  target,
  muted,
  onCollect,
  onClose,
}: Props) {
  useEffect(() => {
    if (target.kind !== "word") return;
    const info = getWordDisplayInfo(target.wordId);
    const text = info?.lemma ?? target.objectLabel;
    void speakText(text, { lang: "en-US", muted });
  }, [target, muted]);

  if (target.kind === "brother") return null;

  const title =
    target.kind === "word" ?
      getWordDisplayInfo(target.wordId)?.displayLabel ?? target.objectLabel
    : target.label;

  const subtitle =
    target.kind === "word" ?
      "Listen and collect this word for brother's homework."
    : "Pick this up for brother.";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <KidPanel className="w-full max-w-sm text-center">
        <h3 className="text-xl font-extrabold text-kid-ink">{title}</h3>
        <p className="mt-2 text-sm font-semibold text-kid-ink/85">{subtitle}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <KidButton
            type="button"
            variant="accent"
            onClick={() => {
              playSfx("tap", muted);
              onCollect();
            }}
          >
            Collect
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </KidButton>
        </div>
      </KidPanel>
    </div>
  );
}
