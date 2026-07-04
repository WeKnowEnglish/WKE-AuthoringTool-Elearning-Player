"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { minLevelForUnlock } from "@/lib/progress/unlock-registry";

type Props = {
  playerLevel: number;
  onGoLearn: () => void;
};

export function GardenLockedPanel({ playerLevel, onGoLearn }: Props) {
  const unlockLevel = minLevelForUnlock("language_garden");

  return (
    <div className="mx-auto w-full max-w-lg">
      <KidPanel className="p-6 text-center">
        <p className="text-4xl" aria-hidden>
          🌿
        </p>
        <h1 className="mt-3 text-2xl font-extrabold text-kid-ink">Language Garden</h1>
        <p className="mt-2 text-sm font-semibold text-kid-ink/80">
          Reach level {unlockLevel} to start growing letters!
        </p>
        <p className="mt-1 text-sm font-bold text-kid-ink/65">
          You are level {playerLevel}. Keep learning to level up.
        </p>
        <KidButton className="mt-5 w-full !min-h-12" onClick={onGoLearn}>
          Go to Learn
        </KidButton>
      </KidPanel>
    </div>
  );
}
