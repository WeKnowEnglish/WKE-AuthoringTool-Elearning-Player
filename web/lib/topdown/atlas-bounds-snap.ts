import type { PreviewAtlasId } from "@/lib/topdown/atlas-registry";
import { isLetterFruitAtlasId } from "@/lib/topdown/letter-fruit-variants";
import type { SpriteRect } from "@/lib/topdown/types";
import { snapDetectedBoundsToCanonical } from "@/lib/topdown/sprite-utils";
import {
  snapBoundsToWkePathGrid,
  WKE_PATH_DETECT_OPTIONS,
} from "@/lib/topdown/wke-path-grid";
import {
  snapBoundsToWkeTerrainGrid,
  WKE_TERRAIN_DETECT_OPTIONS,
} from "@/lib/topdown/wke-terrain-grid";
import { GARDEN_DETECT_OPTIONS } from "@/lib/topdown/garden-detect";
import {
  detectLetterFruitStageBoundsAtPoint,
  LETTER_FRUIT_DETECT_OPTIONS,
} from "@/lib/topdown/letter-fruit-detect";
import { detectBestSpriteBoundsAtPoint } from "@/lib/topdown/sprite-edge-detection";
import type { EdgeDetectOptions } from "@/lib/topdown/sprite-edge-detection";

const WKE_GRID_ATLAS_IDS = new Set<PreviewAtlasId>(["wke-terrain", "wke-path"]);

export function atlasUsesWkeGridSnap(atlasId?: PreviewAtlasId | string): boolean {
  return atlasId != null && WKE_GRID_ATLAS_IDS.has(atlasId as PreviewAtlasId);
}

export function edgeDetectOptionsForAtlas(atlasId: PreviewAtlasId | string): EdgeDetectOptions | undefined {
  if (atlasId === "wke-terrain") return WKE_TERRAIN_DETECT_OPTIONS;
  if (atlasId === "wke-path") return WKE_PATH_DETECT_OPTIONS;
  if (atlasId === "garden") return GARDEN_DETECT_OPTIONS;
  if (isLetterFruitAtlasId(atlasId)) return LETTER_FRUIT_DETECT_OPTIONS;
  return undefined;
}

export function detectBoundsForAtlas(
  atlasId: PreviewAtlasId | string,
  data: Uint8ClampedArray,
  sheetWidth: number,
  sheetHeight: number,
  clickX: number,
  clickY: number,
): SpriteRect | null {
  if (isLetterFruitAtlasId(atlasId)) {
    return detectLetterFruitStageBoundsAtPoint(
      data,
      sheetWidth,
      sheetHeight,
      clickX,
      clickY,
    );
  }

  return detectBestSpriteBoundsAtPoint(
    data,
    sheetWidth,
    sheetHeight,
    clickX,
    clickY,
    edgeDetectOptionsForAtlas(atlasId),
  );
}

/** Snap a sheet click to the nearest WKE grid cell (no pixel detect required). */
export function snapBoundsFromClickForAtlas(
  atlasId: PreviewAtlasId | string,
  click: { x: number; y: number },
  sheetWidth: number,
  sheetHeight: number,
): SpriteRect | null {
  const seed = { sx: click.x, sy: click.y, sw: 1, sh: 1 };
  if (atlasId === "wke-terrain") {
    return snapBoundsToWkeTerrainGrid(seed, sheetWidth, sheetHeight, click);
  }
  if (atlasId === "wke-path") {
    return snapBoundsToWkePathGrid(seed, sheetWidth, sheetHeight, click);
  }
  return null;
}

export function snapBoundsForAtlas(
  atlasId: PreviewAtlasId | string,
  rect: SpriteRect,
  sheetWidth: number,
  sheetHeight: number,
  click?: { x: number; y: number },
  canonicalBounds?: SpriteRect,
): SpriteRect {
  if (atlasId === "wke-terrain") {
    return snapBoundsToWkeTerrainGrid(rect, sheetWidth, sheetHeight, click);
  }
  if (atlasId === "wke-path") {
    return snapBoundsToWkePathGrid(rect, sheetWidth, sheetHeight, click);
  }
  if (canonicalBounds) {
    return snapDetectedBoundsToCanonical(rect, canonicalBounds, sheetWidth, sheetHeight);
  }
  return rect;
}
