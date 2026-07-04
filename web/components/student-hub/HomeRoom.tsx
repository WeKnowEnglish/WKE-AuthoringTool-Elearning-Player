"use client";

import { useEffect, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { WorldExplorationBar, WorldHomeStage } from "@/components/worlds";
import { playSfx } from "@/lib/audio/sfx";
import { ensurePetDog, getPlayerAppearanceId } from "@/lib/progress/local-storage";
import type { PlayerAppearanceId } from "@/lib/progress/types";
import { getRewards } from "@/lib/progress/rewards";
import type { StickerDef } from "@/lib/progress/sticker-library";
import { STICKER_LIBRARY } from "@/lib/progress/sticker-library";
import { getWorldWordDiscoverySummary } from "@/lib/explore/area-discovery";
import { getExploreArea, listExploreAreas } from "@/lib/explore/areas";
import type { ExploreAreaDiscoverySummary } from "@/lib/explore/area-discovery";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import {
  getWorld1ExplorationSummary,
  type WorldExplorationSummary,
} from "@/lib/worlds/exploration";
import { WORLD_1_SIMPLE } from "@/lib/worlds/world-1-simple";
import type { CollectionPageId } from "@/components/student-hub/collection/types";
import { getGardenAttentionHint } from "@/lib/garden/garden-status";
import { getGardenSnapshot } from "@/lib/garden/storage";
import type { GardenAttentionHint } from "@/lib/garden/garden-status";

type Props = {
  muted: boolean;
  experience: number;
  hydrated: boolean;
  dailyQuestUiKey: number;
  explorationUiKey: number;
  gardenUiKey: number;
  playerLevel: number;
  onGoLearn: () => void;
  onGoPet: () => void;
  onGoGarden: () => void;
  onOpenCollection: (page?: CollectionPageId) => void;
  onOpenExplore: (areaId: ExploreAreaId) => void;
};

function buildStickerShowcase(ownedIds: string[]): StickerDef[] {
  return ownedIds
    .slice(-6)
    .map((id) => STICKER_LIBRARY.find((s) => s.id === id))
    .filter((s): s is StickerDef => Boolean(s));
}

export function HomeRoom({
  muted,
  experience,
  hydrated,
  dailyQuestUiKey,
  explorationUiKey,
  gardenUiKey,
  playerLevel,
  onGoLearn,
  onGoPet,
  onGoGarden,
  onOpenCollection,
  onOpenExplore,
}: Props) {
  const [playerAppearanceId, setPlayerAppearanceId] = useState<PlayerAppearanceId>("default");
  const [exploration, setExploration] = useState<WorldExplorationSummary | null>(null);
  const [areaDiscoveryById, setAreaDiscoveryById] = useState<
    Partial<Record<ExploreAreaId, ExploreAreaDiscoverySummary>> | undefined
  >(undefined);
  const [showcase, setShowcase] = useState<StickerDef[]>([]);
  const [gardenHint, setGardenHint] = useState<GardenAttentionHint | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    ensurePetDog();
    setPlayerAppearanceId(getPlayerAppearanceId());
    setExploration(getWorld1ExplorationSummary());
    const word = getWorldWordDiscoverySummary();
    setAreaDiscoveryById(
      Object.fromEntries(word.areas.map((a) => [a.areaId, a])) as Partial<
        Record<ExploreAreaId, ExploreAreaDiscoverySummary>
      >,
    );
    setShowcase(buildStickerShowcase(getRewards().ownedStickerIds ?? []));
    setGardenHint(getGardenAttentionHint(getGardenSnapshot(), { playerLevel }));
  }, [hydrated, dailyQuestUiKey, explorationUiKey, gardenUiKey, playerLevel]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      {hydrated ?
        <WorldExplorationBar
          worldName={WORLD_1_SIMPLE.name}
          summary={exploration}
          prominent
          className="w-full"
        />
      : (
        <div
          className="h-[5.5rem] w-full rounded-2xl border-4 border-kid-ink/30 bg-kid-panel/50"
          aria-hidden
        />
      )}

      <WorldHomeStage
        world={WORLD_1_SIMPLE}
        playerAppearanceId={playerAppearanceId}
        hydrated={hydrated}
        areaDiscoveryById={areaDiscoveryById}
        onPetCare={() => {
          playSfx("tap", muted);
          onGoPet();
        }}
        onSelectExploreArea={(areaId) => {
          if (getExploreArea(areaId).playMode !== "scene") {
            playSfx("wrong", muted);
            return;
          }
          playSfx("tap", muted);
          onOpenExplore(areaId);
        }}
      />

      {gardenHint ?
        <KidButton
          type="button"
          variant="accent"
          className="w-full !min-h-[3.5rem] !text-lg"
          onClick={() => {
            playSfx("tap", muted);
            onGoGarden();
          }}
        >
          {gardenHint.buttonLabel}
        </KidButton>
      : null}

      {hydrated && showcase.length > 0 ? (
        <section className="rounded-2xl border-4 border-kid-ink bg-kid-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/90">Stickers</p>
            <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-sm font-bold">
              <button
                type="button"
                className="text-[#0a2f86] underline decoration-2 underline-offset-2"
                onClick={() => {
                  playSfx("tap", muted);
                  onOpenCollection("stickers");
                }}
              >
                Collection
              </button>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {showcase.map((s) => (
              <li
                key={s.id}
                className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-kid-ink bg-white text-3xl"
                title={s.label}
              >
                <span aria-hidden>{s.emoji}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hydrated && areaDiscoveryById ?
        <StorySceneButton
          muted={muted}
          areaDiscoveryById={areaDiscoveryById}
          onOpenExplore={onOpenExplore}
        />
      : (
        <div className="h-14 w-full animate-pulse rounded-2xl border-4 border-kid-ink/30 bg-kid-panel/50" aria-hidden />
      )}

      <KidButton
        type="button"
        variant="secondary"
        className="w-full !min-h-12 !text-base"
        onClick={onGoLearn}
      >
        Word practice
      </KidButton>

      <p className="text-center text-sm font-semibold text-kid-ink/75">
        <button
          type="button"
          className="text-[#0a2f86] underline decoration-2 underline-offset-2"
          onClick={() => {
            playSfx("tap", muted);
            onOpenCollection("achievements");
          }}
        >
          Awards & skills
        </button>
      </p>
    </div>
  );
}

function StorySceneButton({
  muted,
  areaDiscoveryById,
  onOpenExplore,
}: {
  muted: boolean;
  areaDiscoveryById: Partial<Record<ExploreAreaId, ExploreAreaDiscoverySummary>>;
  onOpenExplore: (areaId: ExploreAreaId) => void;
}) {
  const sceneAreas = listExploreAreas().filter((area) => area.playMode === "scene");
  const nextArea =
    sceneAreas.find((area) => {
      const summary = areaDiscoveryById[area.id];
      return summary?.unlocked !== false && !summary?.complete;
    }) ?? sceneAreas[0];

  if (!nextArea) {
    return (
      <KidPanel className="text-center">
        <p className="text-lg font-extrabold text-kid-ink">Story coming soon</p>
        <p className="mt-1 text-sm font-semibold text-kid-ink/85">
          The next top-down adventure area is being prepared.
        </p>
      </KidPanel>
    );
  }

  const summary = areaDiscoveryById[nextArea.id];
  const allSceneComplete = sceneAreas.every((area) => areaDiscoveryById[area.id]?.complete);
  const label =
    allSceneComplete ?
      `Replay story - ${nextArea.title}`
    : summary && summary.discoveredCount > 0 ?
      `Continue story - ${nextArea.title}`
    : `Start story - ${nextArea.title}`;

  return (
    <KidButton
      type="button"
      variant="accent"
      className="w-full !min-h-[3.5rem] !text-lg"
      onClick={() => {
        playSfx("tap", muted);
        onOpenExplore(nextArea.id);
      }}
    >
      {label}
    </KidButton>
  );
}
