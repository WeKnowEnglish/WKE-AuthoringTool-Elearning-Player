"use client";

import { clsx } from "clsx";
import { WeedMonsterPlotOverlay } from "@/components/garden/WeedMonsterPlotOverlay";
import { LetterFruitStackedPlotCell } from "@/components/topdown/LetterFruitStackedPlotCell";
import { TopDownStackedIndividualTile } from "@/components/topdown/TopDownIndividualTile";
import { useResolvedSpriteBounds } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { useLetterFruitSelector } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import { GARDEN_MAP_LAYOUT } from "@/lib/garden/garden-map-layout";
import { getLetterFruitAtlas, letterFruitAssetKey } from "@/lib/topdown/letter-fruit-atlas";
import { mockPlotStateToLetterFruitStage, mockPlotStateLetterFruitReadyGlow } from "@/lib/topdown/letter-fruit-plot-stage";
import { getIndividualTile } from "@/lib/topdown/individual-tiles";
import { mockPlotStateToIndividualTileId } from "@/lib/topdown/plot-to-individual-tile";
import type { MockPlotState } from "@/lib/topdown/preview-mock-data";
import type { FarmPlot } from "@/lib/garden/types";

const PREVIEW_WEED_MONSTER_PLOT: FarmPlot = {
  row: 0,
  col: 0,
  seedId: null,
  seedTier: null,
  plantedAt: null,
  growMultiplier: 1,
  weedMonster: {
    puzzleId: "preview:weed-monster",
    words: ["CAT", "DOG", "HEN"],
    letterTray: ["C", "A", "T", "D", "O", "G", "H", "E", "N"],
  },
};

type Props = {
  state: MockPlotState;
  label?: string;
  waterMode?: boolean;
  fertilizeMode?: boolean;
};

export function mockPlotOverlayText(state: MockPlotState): string | null {
  switch (state) {
    case "sprout":
      return "42s";
    case "growing":
      return "18s";
    case "watered_growing":
      return "💧 18s";
    case "ready":
      return "Tap!";
    case "ready_fertilized":
      return "🧪 Tap!";
    case "empty_weed_monster":
      return "Fight!";
    default:
      return null;
  }
}

function ariaLabelForState(state: MockPlotState): string {
  switch (state) {
    case "empty":
      return "Empty plot — preview";
    case "selected_empty":
      return "Selected empty plot — preview";
    case "sprout":
      return "Sprout stage crop — preview";
    case "growing":
      return "Growing crop — preview";
    case "watered_growing":
      return "Watered growing crop — preview";
    case "ready":
      return "Ready crop — preview";
    case "ready_fertilized":
      return "Fertilized ready crop — preview";
    case "empty_weed_monster":
      return "Empty plot blocked by a weed monster — preview";
    case "locked_grass":
      return "Locked grass plot — preview";
  }
}

export function MockGardenPlotTile({ state, label, waterMode, fertilizeMode }: Props) {
  const { slug, atlasId } = useLetterFruitSelector();
  const atlas = getLetterFruitAtlas(slug);
  const tileId = mockPlotStateToIndividualTileId(state);
  const fruitStage = mockPlotStateToLetterFruitStage(state);
  const assetId = fruitStage ? letterFruitAssetKey(slug, fruitStage) : null;
  const bounds = useResolvedSpriteBounds(
    atlasId,
    assetId ?? letterFruitAssetKey(slug, "seed"),
    assetId ? atlas.assets[assetId] : atlas.assets[letterFruitAssetKey(slug, "seed")],
  );
  const tile = getIndividualTile(tileId);
  const showWeedMonster = state === "empty_weed_monster";
  const isReady = state === "ready" || state === "ready_fertilized";
  const isGrowing = state === "sprout" || state === "growing" || state === "watered_growing";
  const canWater = Boolean(waterMode) && isGrowing && state !== "watered_growing";
  const canFertilize = Boolean(fertilizeMode) && isGrowing;

  if (!tile) {
    return (
      <div
        className="bg-red-900/40"
        style={{
          width: GARDEN_MAP_LAYOUT.logicalTilePx,
          height: GARDEN_MAP_LAYOUT.logicalTilePx,
        }}
        title={`Missing tile: ${tileId}`}
      />
    );
  }

  return (
    <div
      className={clsx(
        "relative overflow-visible",
        canWater && "ring-2 ring-sky-400/80 ring-offset-1",
        canFertilize && "ring-2 ring-amber-400/80 ring-offset-1",
        state === "selected_empty" && "ring-4 ring-[#0f4ecf] ring-offset-2",
        isReady && "drop-shadow-[0_0_8px_rgba(16,185,129,0.55)]",
        showWeedMonster && "drop-shadow-[0_0_8px_rgba(132,204,22,0.55)]",
      )}
      style={{
        width: GARDEN_MAP_LAYOUT.logicalTilePx,
        height: GARDEN_MAP_LAYOUT.logicalTilePx,
      }}
      aria-label={ariaLabelForState(state)}
      title={label}
    >
      {fruitStage ?
        <LetterFruitStackedPlotCell
          stage={fruitStage}
          bounds={bounds}
          baseTileId="dirt_tilled"
          readyGlow={mockPlotStateLetterFruitReadyGlow(state)}
        />
      : <TopDownStackedIndividualTile
          tile={tile}
          footprint={tile.footprint}
          layout={GARDEN_MAP_LAYOUT}
        />
      }
      {showWeedMonster ?
        <WeedMonsterPlotOverlay plot={PREVIEW_WEED_MONSTER_PLOT} now={Date.now()} />
      : null}
    </div>
  );
}
