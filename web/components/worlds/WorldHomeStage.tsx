"use client";

import { clsx } from "clsx";
import { PlayerCharacter } from "@/components/avatar/PlayerCharacter";
import { PetCompanion } from "@/components/worlds/PetCompanion";
import { WorldLevelPlatform } from "@/components/worlds/WorldLevelPlatform";
import { WorldLevelStrip } from "@/components/worlds/WorldLevelStrip";
import { AVATAR_PRESETS } from "@/lib/avatar/defaults";
import { growthStageForPreset, robotGrowthLabel } from "@/lib/avatar/growth";
import { presetIdForLoadout } from "@/lib/avatar/progress";
import type { AvatarLoadout } from "@/lib/avatar/types";
import type { PlayerAppearanceId } from "@/lib/progress/types";
import type { WorldDef } from "@/lib/worlds/types";

type Props = {
  world: WorldDef;
  playerAppearanceId: PlayerAppearanceId;
  petLoadout: AvatarLoadout | null;
  playerLevel: number;
  hydrated: boolean;
  petPresetLabel?: string | null;
  onPetCare?: () => void;
  levelsWithProgress?: number[];
  className?: string;
};

export function WorldHomeStage({
  world,
  playerAppearanceId,
  petLoadout,
  playerLevel,
  hydrated,
  petPresetLabel,
  onPetCare,
  levelsWithProgress,
  className,
}: Props) {
  const presetId = petLoadout ? presetIdForLoadout(petLoadout) : null;
  const presetLabel =
    petPresetLabel ??
    (presetId ? (AVATAR_PRESETS.find((p) => p.id === presetId)?.label ?? null) : null);
  const robotGrowth = growthStageForPreset(presetId, playerLevel);

  return (
    <section
      className={clsx(
        "overflow-hidden rounded-2xl border-4 border-kid-ink shadow-[4px_4px_0_#1a1a1a]",
        className,
      )}
      style={{
        background: `linear-gradient(180deg, ${world.theme.sky} 0%, ${world.theme.grass} 72%)`,
      }}
      aria-label={`${world.name} home stage`}
    >
      <div className="border-b-2 border-kid-ink/15 px-3 py-2 text-center">
        <p className="text-sm font-extrabold text-kid-ink">{world.name}</p>
        <p className="text-xs font-semibold text-kid-ink/80">{world.tagline}</p>
      </div>

      <div className="relative px-4 pb-3 pt-6">
        <div className="relative mx-auto flex max-w-[12rem] flex-col items-center">
          <div className="relative z-[1] flex justify-center" suppressHydrationWarning>
            <PlayerCharacter
              appearanceId={playerAppearanceId}
              size="lg"
              show={hydrated}
            />
          </div>

          <PetCompanion
            loadout={petLoadout}
            playerLevel={playerLevel}
            show={hydrated}
          />

          <div className="relative z-0 -mt-2 w-full">
            <WorldLevelPlatform theme={world.theme} />
          </div>
        </div>

        <div className="mt-3 space-y-1 text-center" suppressHydrationWarning>
          <p className="text-sm font-bold text-kid-ink">Welcome back!</p>
          {presetLabel ?
            <p className="text-xs font-semibold text-kid-ink/85">
              {presetLabel} is following you.
            </p>
          : (
            <p className="text-xs font-semibold text-kid-ink/85">
              <a href="/profile" className="font-bold text-[#0a2f86] underline decoration-2 underline-offset-2">
                Pick a pet
              </a>{" "}
              on your Profile.
            </p>
          )}
          {robotGrowth ?
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-kid-ink/70">
              Pet stage {robotGrowth} · {robotGrowthLabel(robotGrowth)}
            </p>
          : null}
          {onPetCare ?
            <button
              type="button"
              className="text-xs font-bold text-[#0a2f86] underline decoration-2 underline-offset-2"
              onClick={onPetCare}
            >
              Pet Care
            </button>
          : null}
        </div>

        <WorldLevelStrip
          world={world}
          levelsWithProgress={levelsWithProgress}
          className="mt-4"
        />
      </div>
    </section>
  );
}
