import { GARDEN_MAP_LAYOUT } from "@/lib/garden/garden-map-layout";
import { WEED_MONSTER_SPRITE } from "@/lib/topdown/garden-sprite-atlas";
import { computePlotFruitPlacement } from "@/lib/topdown/plot-layer-placement";
import type { PlotFruitLayerPlacement, PlotFruitPlacement } from "@/lib/topdown/plot-layer-types";

/** Hand-tuned — weed monster standing on empty tilled soil. */
export const WEED_MONSTER_PLOT_LAYER: PlotFruitLayerPlacement = {
  scale: 0.21,
  offsetX: 0,
  offsetY: -8,
  anchor: "bottom-center",
};

export function computeWeedMonsterPlotPlacement(
  cellPx = GARDEN_MAP_LAYOUT.logicalTilePx,
): PlotFruitPlacement {
  return computePlotFruitPlacement({
    cellPx,
    cropSw: WEED_MONSTER_SPRITE.sw,
    cropSh: WEED_MONSTER_SPRITE.sh,
    layer: WEED_MONSTER_PLOT_LAYER,
  });
}
