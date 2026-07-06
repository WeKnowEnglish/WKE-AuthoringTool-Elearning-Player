"use client";

import { clsx } from "clsx";
import { WeedMonsterPlotOverlay } from "@/components/garden/WeedMonsterPlotOverlay";
import { LetterFruitStackedPlotCell } from "@/components/topdown/LetterFruitStackedPlotCell";
import { TopDownStackedIndividualTile } from "@/components/topdown/TopDownIndividualTile";
import type { FarmPlot } from "@/lib/garden";
import {
  GARDEN_MAP_LAYOUT,
  gardenPlotAriaLabel,
  gardenPlotInteractionState,
  type GardenPlotCellVisual,
} from "@/lib/garden/garden-map-layout";
import { getIndividualTile } from "@/lib/topdown/individual-tiles";

type Props = {
  cell: GardenPlotCellVisual;
  now: number;
  selected?: boolean;
  waterMode?: boolean;
  fertilizeMode?: boolean;
  onSelect: (plot: FarmPlot) => void;
};

export function GardenStackedPlotCell({
  cell,
  now,
  selected,
  waterMode,
  fertilizeMode,
  onSelect,
}: Props) {
  const plot = cell.plot;
  const { fruitStage, fruitSlug } = cell.plotVisual;
  const showFruit = fruitStage != null && fruitSlug != null;
  const tile = getIndividualTile(cell.tileId);
  const interaction = gardenPlotInteractionState(plot, now, {
    waterMode,
    fertilizeMode,
    selected,
  });

  if (!tile) {
    return (
      <div
        className="bg-red-900/40"
        style={{
          width: GARDEN_MAP_LAYOUT.logicalTilePx,
          height: GARDEN_MAP_LAYOUT.logicalTilePx,
        }}
        title={`Missing tile: ${cell.tileId}`}
      />
    );
  }

  const showWeedMonster =
    !showFruit &&
    interaction.stage === "empty" &&
    interaction.hasWeed &&
    plot.weedMonster != null;

  return (
    <button
      type="button"
      className={clsx(
        "relative overflow-visible transition-transform [touch-action:manipulation]",
        interaction.canWater && "ring-2 ring-sky-400/80 ring-offset-1",
        interaction.canFertilize && "ring-2 ring-amber-400/80 ring-offset-1",
        interaction.selected && "ring-4 ring-[#0f4ecf] ring-offset-2",
        interaction.isReady &&
          !interaction.hasWeed &&
          !showFruit &&
          "drop-shadow-[0_0_8px_rgba(16,185,129,0.55)]",
        interaction.hasWeed && "drop-shadow-[0_0_8px_rgba(132,204,22,0.55)]",
        "hover:scale-[1.03] active:scale-95",
      )}
      style={{
        width: GARDEN_MAP_LAYOUT.logicalTilePx,
        height: GARDEN_MAP_LAYOUT.logicalTilePx,
      }}
      aria-label={gardenPlotAriaLabel(plot, now, interaction)}
      onClick={() => onSelect(plot)}
    >
      {showFruit ?
        <LetterFruitStackedPlotCell
          slug={fruitSlug}
          stage={fruitStage}
          readyGlow={interaction.isReady}
        />
      : <>
          <TopDownStackedIndividualTile
            tile={tile}
            footprint={tile.footprint}
            layout={GARDEN_MAP_LAYOUT}
          />
          {showWeedMonster ?
            <WeedMonsterPlotOverlay plot={plot} now={now} />
          : null}
        </>
      }
    </button>
  );
}
