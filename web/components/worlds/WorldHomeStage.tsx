"use client";

import { clsx } from "clsx";
import { HOME_PLAYER_AVATAR_SVG_PATH, PlayerCharacter } from "@/components/avatar/PlayerCharacter";
import { PetCompanion } from "@/components/worlds/PetCompanion";
import { WorldLevelPlatform } from "@/components/worlds/WorldLevelPlatform";
import { WorldLevelStrip } from "@/components/worlds/WorldLevelStrip";
import type { ExploreAreaDiscoverySummary } from "@/lib/explore/area-discovery";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import type { PlayerAppearanceId } from "@/lib/progress/types";
import type { WorldDef } from "@/lib/worlds/types";

type Props = {
  world: WorldDef;
  playerAppearanceId: PlayerAppearanceId;
  hydrated: boolean;
  onPetCare?: () => void;
  areaDiscoveryById?: Partial<Record<ExploreAreaId, ExploreAreaDiscoverySummary>>;
  onSelectExploreArea?: (areaId: ExploreAreaId) => void;
  className?: string;
};

export function WorldHomeStage({
  world,
  playerAppearanceId,
  hydrated,
  onPetCare,
  areaDiscoveryById,
  onSelectExploreArea,
  className,
}: Props) {
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
              svgPath={HOME_PLAYER_AVATAR_SVG_PATH}
            />
          </div>

          <PetCompanion
            show={hydrated}
            size="md"
            className="origin-bottom-right translate-x-[150px] translate-y-[150px] scale-[1.5]"
          />

          <div className="relative z-0 -mt-2 w-full">
            <WorldLevelPlatform theme={world.theme} />
          </div>
        </div>

        <div className="mt-3 space-y-1 text-center" suppressHydrationWarning>
          <p className="text-sm font-bold text-kid-ink">Welcome back!</p>
          <p className="text-xs font-semibold text-kid-ink/85">
            Your dog is following you.
          </p>
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
          areaDiscoveryById={areaDiscoveryById}
          onSelectArea={onSelectExploreArea}
          className="mt-4"
        />
      </div>
    </section>
  );
}
