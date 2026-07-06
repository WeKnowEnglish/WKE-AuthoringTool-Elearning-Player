import type {
  PlotFruitLayerPlacement,
  PlotLayerAnchor,
} from "@/lib/topdown/plot-layer-types";

export type PlotLayerAlignment =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right";

const ALIGNMENT_TO_ANCHOR: Record<PlotLayerAlignment, PlotLayerAnchor> = {
  center: "center",
  top: "top-center",
  bottom: "bottom-center",
  left: "middle-left",
  right: "middle-right",
};

/** Snap anchor and zero offsets — scale is unchanged. */
export function applyPlotLayerAlignment(
  layer: PlotFruitLayerPlacement,
  alignment: PlotLayerAlignment,
): PlotFruitLayerPlacement {
  return {
    ...layer,
    anchor: ALIGNMENT_TO_ANCHOR[alignment],
    offsetX: 0,
    offsetY: 0,
  };
}
