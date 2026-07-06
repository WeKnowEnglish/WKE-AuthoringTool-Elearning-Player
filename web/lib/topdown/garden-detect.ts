import type { EdgeDetectOptions } from "@/lib/topdown/sprite-edge-detection";

/**
 * Garden sheet detect tuning — large irregular sprites (tools, weeds, plants).
 * Uses flood-fill from the click point instead of gutter grid snap.
 */
export const GARDEN_DETECT_OPTIONS = {
  floodFillOnly: true,
  maxCellSize: 280,
  minSize: 24,
  maxFill: 150_000,
  bgTolerance: 42,
  searchRadius: 160,
  /** Anti-alias cushion — gutter knockout strips extra grey in preview. */
  boundsPadding: 6,
} as const satisfies EdgeDetectOptions;
