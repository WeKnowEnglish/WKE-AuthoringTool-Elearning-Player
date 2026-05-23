"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { PetCareButton } from "@/components/student-hub/PetCareButton";
import { PetMeterBar } from "@/components/student-hub/PetMeterBar";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  applyPetCare,
  getPetSnapshot,
  isStudyCarePending,
  petMoodLine,
  setStudyCarePending,
} from "@/lib/pet";
import { PET_MOOD_DURATION_MS } from "@/lib/pet/mood-durations";
import { PET_METER_IDS } from "@/lib/pet/types";
import type { PetSnapshotV1 } from "@/lib/pet/types";
import { usePetMoodAnimation } from "@/lib/pet/use-pet-mood-animation";
import { ensurePetDog } from "@/lib/progress/local-storage";
import { KidButton } from "@/components/kid-ui/KidButton";
import { PetDrinkMixOverlay } from "@/components/pet-blender/PetDrinkMixOverlay";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import {
  canClaimPetGold,
  claimPetGold,
  formatCooldownRemaining,
  isPetWellCared,
  petGoldClaimCooldownRemainingMs,
  PET_WELL_CARED_THRESHOLD,
} from "@/lib/skills";
import { getSkillRanks } from "@/lib/skills/ranks";
import { getRewards } from "@/lib/progress/rewards";

type Props = {
  muted: boolean;
  petUiKey: number;
  onGoLearn: () => void;
  onGoHome: () => void;
  onEconomyChange?: () => void;
};

export function PetRoom({
  muted,
  petUiKey,
  onGoLearn,
  onEconomyChange,
}: Props) {
  const hydrated = useClientHydrated();
  const { mood, bumpMood } = usePetMoodAnimation("normal");
  const [drinkMixOpen, setDrinkMixOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<PetSnapshotV1 | null>(null);

  const refreshPet = useCallback(() => {
    setSnapshot(getPetSnapshot());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    ensurePetDog();
    refreshPet();
  }, [hydrated, petUiKey, refreshPet]);

  const studyPending = hydrated && isStudyCarePending();
  const moodLine = snapshot ? petMoodLine(snapshot) : null;

  const petTreasureRank =
    hydrated ? (getSkillRanks(getRewards()).pet_treasure ?? 0) : 0;
  const hasTreasureSkill = petTreasureRank >= 1;
  const wellCared = snapshot ? isPetWellCared(snapshot) : false;
  const cooldownMs =
    snapshot ? petGoldClaimCooldownRemainingMs(snapshot.lastPetGoldClaimAt) : 0;
  const claimPreview = hydrated ? canClaimPetGold() : null;
  const canClaim = claimPreview?.ok === true;

  const onClaimTreasure = () => {
    playSfx("correct", muted);
    const result = claimPetGold();
    if (result.ok) {
      refreshPet();
      onEconomyChange?.();
    } else {
      playSfx("wrong", muted);
    }
  };

  const runCare = (action: "feed" | "play" | "wash" | "sleep") => {
    playSfx("tap", muted);
    setSnapshot(applyPetCare(action));
    if (action === "play") {
      bumpMood("playful", PET_MOOD_DURATION_MS.playful);
    } else {
      bumpMood("excited", PET_MOOD_DURATION_MS.excited);
    }
  };

  const onDrink = () => {
    playSfx("tap", muted);
    setDrinkMixOpen(true);
  };

  const onDrinkMixSuccess = () => {
    setSnapshot(applyPetCare("drink"));
    setDrinkMixOpen(false);
    bumpMood("excited", PET_MOOD_DURATION_MS.excited);
  };

  const onStudy = () => {
    playSfx("tap", muted);
    setStudyCarePending();
    refreshPet();
    onGoLearn();
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-kid-ink">Pet Care</h1>
        <p className="mt-1 text-sm font-semibold text-kid-ink/85">
          Take care of your dog
        </p>
      </div>

      {studyPending ? (
        <KidPanel className="border-sky-800 bg-sky-50 py-3 text-center">
          <p className="text-sm font-bold text-sky-950">
            Finish a learn activity to study together!
          </p>
        </KidPanel>
      ) : null}

      <div className="flex flex-col items-center gap-3">
        <AnimatedPet mood={mood} size="lg" show={hydrated && !drinkMixOpen} />
        {moodLine && !drinkMixOpen ?
          <p className="text-sm font-bold text-kid-ink/90">{moodLine}</p>
        : null}
      </div>

      {hydrated && snapshot ?
        <KidPanel className="space-y-3">
          {PET_METER_IDS.map((id) => (
            <PetMeterBar key={id} meterId={id} value={snapshot.meters[id]} />
          ))}
        </KidPanel>
      : (
        <KidPanel className="h-40 animate-pulse bg-kid-surface-muted" aria-hidden>
          {null}
        </KidPanel>
      )}

      {hasTreasureSkill && snapshot ?
        <KidPanel className="space-y-2 text-center">
          <p className="text-sm font-extrabold text-kid-ink">Pet treasure</p>
          <p className="text-xs font-semibold text-kid-ink/80">
            {wellCared ?
              `All meters ${PET_WELL_CARED_THRESHOLD}%+ — ready to claim!`
            : `Raise every meter to ${PET_WELL_CARED_THRESHOLD}% to claim gold.`}
          </p>
          {cooldownMs > 0 ?
            <p className="text-xs font-bold text-amber-900">
              Next claim in {formatCooldownRemaining(cooldownMs)}
            </p>
          : null}
          <KidButton
            type="button"
            variant={canClaim ? "accent" : "secondary"}
            className="!min-h-11 w-full !py-2 text-sm"
            disabled={!canClaim}
            onClick={onClaimTreasure}
          >
            {canClaim ? "Claim gold!" : cooldownMs > 0 ? "On cooldown" : "Not ready"}
          </KidButton>
        </KidPanel>
      : hydrated ?
        <KidPanel className="text-center">
          <p className="text-sm font-semibold text-kid-ink/85">
            Unlock <span className="font-extrabold">Pet treasure</span> in Collection → Awards & skills
            to claim bonus gold here.
          </p>
        </KidPanel>
      : null}

      <div className="grid grid-cols-3 gap-2">
        <PetCareButton actionId="feed" onClick={() => runCare("feed")} />
        <PetCareButton actionId="drink" onClick={onDrink} />
        <PetCareButton actionId="play" onClick={() => runCare("play")} />
        <PetCareButton actionId="wash" onClick={() => runCare("wash")} />
        <PetCareButton actionId="sleep" onClick={() => runCare("sleep")} />
        <PetCareButton actionId="study" onClick={onStudy} />
      </div>

      <PetDrinkMixOverlay
        open={drinkMixOpen}
        muted={muted}
        onSuccess={onDrinkMixSuccess}
        onClose={() => setDrinkMixOpen(false)}
      />
    </div>
  );
}
