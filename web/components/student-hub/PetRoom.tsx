"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PetCareButton } from "@/components/student-hub/PetCareButton";
import { PetCareDisplayCard } from "@/components/student-hub/PetCareDisplayCard";
import { PetPlayPickerOverlay } from "@/components/student-hub/PetPlayPickerOverlay";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { unlockSpeechSynthesis } from "@/lib/audio/tts";
import {
  applyDrinkMiniGameResult,
  applyExerciseMiniGameResult,
  applyMemoryPlayResult,
  applyScrabblePlayResult,
  applySandwichMiniGameResult,
  applyPetCare,
  getPetSnapshot,
  isStudyCarePending,
  petBaselineMood,
  petMoodLine,
  setStudyCarePending,
  type DrinkMiniGameResultTier,
  type ExerciseMiniGameResultTier,
  type MemoryPlayOutcome,
  type PlayMiniGameId,
  type SandwichMiniGameResultTier,
  type ScrabblePlayOutcome,
} from "@/lib/pet";
import { PET_MOOD_DURATION_MS } from "@/lib/pet/mood-durations";
import type { PetSnapshotV1 } from "@/lib/pet/types";
import { usePetMoodAnimation } from "@/lib/pet/use-pet-mood-animation";
import { ensurePetDog } from "@/lib/progress/local-storage";
import { KidButton } from "@/components/kid-ui/KidButton";
import { PetDrinkMixOverlay } from "@/components/pet-blender/PetDrinkMixOverlay";
import { PetExerciseOverlay } from "@/components/pet-exercise/PetExerciseOverlay";
import { PetMemoryOverlay } from "@/components/pet-memory";
import { PetScrabbleOverlay } from "@/components/pet-scrabble";
import { PetSandwichOverlay } from "@/components/pet-sandwich/PetSandwichOverlay";
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
  const [drinkMixOpen, setDrinkMixOpen] = useState(false);
  const [sandwichOpen, setSandwichOpen] = useState(false);
  const [playGameId, setPlayGameId] = useState<PlayMiniGameId | null>(null);
  const [playPickerOpen, setPlayPickerOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<PetSnapshotV1 | null>(null);
  const baselineMood = useMemo(
    () => (snapshot ? petBaselineMood(snapshot) : "normal"),
    [snapshot],
  );
  const { mood, bumpMood } = usePetMoodAnimation(baselineMood);

  const refreshPet = useCallback(() => {
    setSnapshot(getPetSnapshot());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    ensurePetDog();
    queueMicrotask(() => {
      if (!cancelled) refreshPet();
    });
    return () => {
      cancelled = true;
    };
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

  const onFeed = () => {
    playSfx("tap", muted);
    unlockSpeechSynthesis();
    setSandwichOpen(true);
  };

  const onSandwichComplete = (tier: SandwichMiniGameResultTier) => {
    setSnapshot(applySandwichMiniGameResult(tier));
    if (tier === "good") {
      bumpMood("excited", PET_MOOD_DURATION_MS.excited);
    } else {
      bumpMood("normal", PET_MOOD_DURATION_MS.normal);
    }
    onEconomyChange?.();
  };

  const runCare = (action: "wash" | "sleep") => {
    playSfx("tap", muted);
    setSnapshot(applyPetCare(action));
    bumpMood("excited", PET_MOOD_DURATION_MS.excited);
  };

  const playOverlayOpen = playGameId != null;

  const closePlayOverlay = () => {
    setPlayGameId(null);
    setPlayPickerOpen(false);
  };

  const onPlay = () => {
    playSfx("tap", muted);
    unlockSpeechSynthesis();
    setPlayPickerOpen(true);
  };

  const openPlayGame = (id: PlayMiniGameId) => {
    playSfx("tap", muted);
    unlockSpeechSynthesis();
    setPlayPickerOpen(false);
    setPlayGameId(id);
  };

  const onExerciseComplete = (tier: ExerciseMiniGameResultTier) => {
    setSnapshot(applyExerciseMiniGameResult(tier));
    if (tier === "good") {
      bumpMood("excited", PET_MOOD_DURATION_MS.excited);
    } else {
      bumpMood("normal", PET_MOOD_DURATION_MS.normal);
    }
    onEconomyChange?.();
  };

  const onScrabbleComplete = (outcome: ScrabblePlayOutcome) => {
    setSnapshot(applyScrabblePlayResult(outcome));
    if (outcome === "completed") {
      bumpMood("playful", PET_MOOD_DURATION_MS.playful);
    } else {
      bumpMood("normal", PET_MOOD_DURATION_MS.normal);
    }
    onEconomyChange?.();
  };

  const onMemoryComplete = (outcome: MemoryPlayOutcome) => {
    setSnapshot(applyMemoryPlayResult(outcome));
    if (outcome === "completed") {
      bumpMood("playful", PET_MOOD_DURATION_MS.playful);
    } else {
      bumpMood("normal", PET_MOOD_DURATION_MS.normal);
    }
    onEconomyChange?.();
  };

  const onDrink = () => {
    playSfx("tap", muted);
    unlockSpeechSynthesis();
    setDrinkMixOpen(true);
  };

  const onDrinkMixComplete = (tier: DrinkMiniGameResultTier) => {
    setSnapshot(applyDrinkMiniGameResult(tier));
    if (tier === "good") {
      bumpMood("excited", PET_MOOD_DURATION_MS.excited);
    } else {
      bumpMood("normal", PET_MOOD_DURATION_MS.normal);
    }
    onEconomyChange?.();
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
            Finish a learning activity to study together!
          </p>
        </KidPanel>
      ) : null}

      {hydrated && snapshot ?
        <PetCareDisplayCard
          snapshot={snapshot}
          mood={mood}
          moodLine={moodLine}
          showPet={!drinkMixOpen && !sandwichOpen && !playOverlayOpen}
        />
      : (
        <KidPanel className="h-52 animate-pulse bg-kid-surface-muted sm:h-60" aria-hidden>
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
        <PetCareButton actionId="feed" onClick={onFeed} />
        <PetCareButton actionId="drink" onClick={onDrink} />
        <PetCareButton actionId="play" onClick={onPlay} />
        <PetCareButton actionId="wash" onClick={() => runCare("wash")} />
        <PetCareButton actionId="sleep" onClick={() => runCare("sleep")} />
        <PetCareButton actionId="study" onClick={onStudy} />
      </div>

      <PetPlayPickerOverlay
        open={playPickerOpen && !playOverlayOpen}
        onPick={openPlayGame}
        onClose={() => setPlayPickerOpen(false)}
      />

      <PetDrinkMixOverlay
        open={drinkMixOpen}
        muted={muted}
        onComplete={onDrinkMixComplete}
        onClose={() => setDrinkMixOpen(false)}
      />

      <PetSandwichOverlay
        open={sandwichOpen}
        muted={muted}
        onComplete={onSandwichComplete}
        onClose={() => setSandwichOpen(false)}
      />

      <PetExerciseOverlay
        open={playGameId === "climb"}
        muted={muted}
        onComplete={onExerciseComplete}
        onClose={closePlayOverlay}
      />

      <PetScrabbleOverlay
        open={playGameId === "scrabble"}
        muted={muted}
        onComplete={(outcome) => onScrabbleComplete(outcome)}
        onClose={closePlayOverlay}
      />

      <PetMemoryOverlay
        open={playGameId === "memory"}
        muted={muted}
        onComplete={(outcome) => onMemoryComplete(outcome)}
        onClose={closePlayOverlay}
      />
    </div>
  );
}
