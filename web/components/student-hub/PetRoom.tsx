"use client";

import { useCallback, useEffect, useState } from "react";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import { PetCareButton } from "@/components/student-hub/PetCareButton";
import { PetMeterBar } from "@/components/student-hub/PetMeterBar";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { AVATAR_PRESETS } from "@/lib/avatar/defaults";
import { growthStageForPreset, robotGrowthLabel } from "@/lib/avatar/growth";
import { presetIdForLoadout } from "@/lib/avatar/progress";
import {
  applyPetCare,
  getPetSnapshot,
  isStudyCarePending,
  petMoodLine,
  setStudyCarePending,
} from "@/lib/pet";
import { PET_METER_IDS } from "@/lib/pet/types";
import type { PetSnapshotV1 } from "@/lib/pet/types";
import { getChosenAvatarLoadout } from "@/lib/progress/local-storage";
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
import { KidButton } from "@/components/kid-ui/KidButton";

type Props = {
  muted: boolean;
  petUiKey: number;
  playerLevel: number;
  onGoLearn: () => void;
  onGoHome: () => void;
  onEconomyChange?: () => void;
};

export function PetRoom({
  muted,
  petUiKey,
  playerLevel,
  onGoLearn,
  onGoHome,
  onEconomyChange,
}: Props) {
  const hydrated = useClientHydrated();
  const [snapshot, setSnapshot] = useState<PetSnapshotV1 | null>(null);
  const loadout = hydrated ? getChosenAvatarLoadout() : null;
  const presetId = loadout ? presetIdForLoadout(loadout) : null;
  const presetLabel =
    presetId ? (AVATAR_PRESETS.find((p) => p.id === presetId)?.label ?? "friend") : null;
  const robotGrowth = growthStageForPreset(presetId, playerLevel);

  const refreshPet = useCallback(() => {
    setSnapshot(getPetSnapshot());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    refreshPet();
  }, [hydrated, petUiKey, refreshPet]);

  const studyPending = hydrated && isStudyCarePending();
  const mood = snapshot ? petMoodLine(snapshot) : null;

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

  const runCare = (action: "feed" | "drink" | "play" | "wash" | "sleep") => {
    playSfx("tap", muted);
    setSnapshot(applyPetCare(action));
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
          {presetLabel ? `Take care of ${presetLabel}` : "Your buddy"}
        </p>
        {robotGrowth ?
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-kid-ink/75">
            Stage {robotGrowth} · {robotGrowthLabel(robotGrowth)}
          </p>
        : null}
      </div>

      {studyPending ? (
        <KidPanel className="border-sky-800 bg-sky-50 py-3 text-center">
          <p className="text-sm font-bold text-sky-950">
            Finish a learn activity to study together!
          </p>
        </KidPanel>
      ) : null}

      {!loadout ?
        <KidPanel className="text-center">
          <p className="font-semibold text-kid-ink">Pick a look on Home first.</p>
          <button
            type="button"
            className="mt-3 text-sm font-bold text-[#0a2f86] underline decoration-2 underline-offset-2"
            onClick={() => {
              playSfx("tap", muted);
              onGoHome();
            }}
          >
            Go to Home
          </button>
        </KidPanel>
      : (
        <div className="flex flex-col items-center gap-3">
          <StudentAvatar
            loadout={loadout}
            playerLevel={playerLevel}
            size="xl"
            show={hydrated}
          />
          {mood ? <p className="text-sm font-bold text-kid-ink/90">{mood}</p> : null}
        </div>
      )}

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
            Unlock <span className="font-extrabold">Pet treasure</span> on your Profile skill tree
            to claim bonus gold here.
          </p>
        </KidPanel>
      : null}

      <div className="grid grid-cols-3 gap-2">
        <PetCareButton actionId="feed" onClick={() => runCare("feed")} />
        <PetCareButton actionId="drink" onClick={() => runCare("drink")} />
        <PetCareButton actionId="play" onClick={() => runCare("play")} />
        <PetCareButton actionId="wash" onClick={() => runCare("wash")} />
        <PetCareButton actionId="sleep" onClick={() => runCare("sleep")} />
        <PetCareButton actionId="study" onClick={onStudy} />
      </div>
    </div>
  );
}
