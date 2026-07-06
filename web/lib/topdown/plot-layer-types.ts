import type { LetterFruitStageId } from "@/lib/topdown/letter-fruit-atlas";
import type { PlotBaseTileId } from "@/lib/topdown/plot-to-individual-tile";

/** Anchor point on the fruit display bbox. */
export type PlotLayerAnchor =
  | "center"
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type PlotFruitLayerPlacement = {
  /** Display scale multiplier on the sheet crop (bounds.sw × bounds.sh). */
  scale: number;
  /** Fine-tune offset after anchor positioning (cell-local px). */
  offsetX: number;
  offsetY: number;
  anchor: PlotLayerAnchor;
};

export type LetterFruitPlotPreset = {
  baseTileId: PlotBaseTileId;
  fruitStage: LetterFruitStageId;
  layer: PlotFruitLayerPlacement;
};

/** Computed pixel placement for rendering inside a plot cell. */
export type PlotFruitPlacement = {
  left: number;
  top: number;
  scale: number;
  displayW: number;
  displayH: number;
};
