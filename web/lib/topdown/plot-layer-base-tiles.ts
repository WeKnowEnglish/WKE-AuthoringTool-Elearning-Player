import type { PlotBaseTileId } from "@/lib/topdown/plot-to-individual-tile";

/** Base tile for plot layer editor — letter fruit composites on tilled soil only. */
export const PLOT_LAYER_BASE_TILE_IDS = ["dirt_tilled"] as const satisfies readonly PlotBaseTileId[];

export function isPlotLayerBaseTileId(id: string): id is PlotBaseTileId {
  return id === "dirt_tilled";
}
