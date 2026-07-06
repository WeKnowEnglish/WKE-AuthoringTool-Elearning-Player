import type { AtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import {
  clampStackPresetToCrop,
  defaultAtlasTileStackPreset,
} from "@/lib/topdown/atlas-tile-layout";
import type { LetterAFruitAssetKey } from "@/lib/topdown/letter-fruit-atlas";

/** Letter A crop height — flat lipStartY clamps to each stage crop sh. */
const LETTER_A_FLAT_LIP_Y = 740;

/** Manually tuned letter-fruit stack presets — pilot starting points.
 *  Used by the atlas bounds/stack editor only. Plot placement uses letter-fruit-plot-presets.ts. */
const TUNED_LETTER_A_PRESETS: Partial<
  Record<LetterAFruitAssetKey, AtlasTileStackPreset>
> = {
  /** Hand-tuned from letter fruit atlas picks — updated via apply-letter-fruit-picks. */
  letter_a_seed: {
    walk: { insetX: 0, insetY: 0, width: 78, height: 69 },
    lipStartY: 69,
    layout: { logicalTilePx: 64, lipOverlapPx: 0, columnOverlapPx: 0 },
  },
  letter_a_sprout: {
    walk: { insetX: 0, insetY: 0, width: 164, height: 173 },
    lipStartY: 173,
    layout: { logicalTilePx: 64, lipOverlapPx: 0, columnOverlapPx: 0 },
  },
  letter_a_young: {
    walk: { insetX: 0, insetY: 0, width: 261, height: 305 },
    lipStartY: 305,
    layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
  },
  letter_a_growing: {
    walk: { insetX: 0, insetY: 0, width: 277, height: 162 },
    lipStartY: 386,
    layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
  },
  letter_a_ripe: {
    walk: { insetX: 0, insetY: 0, width: 330, height: 189 },
    lipStartY: 451,
    layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
  },

};

export function getLetterFruitStackPreset(
  assetId: string,
  sw: number,
  sh: number,
): AtlasTileStackPreset {
  const preset = TUNED_LETTER_A_PRESETS[assetId as LetterAFruitAssetKey];
  if (preset) return clampStackPresetToCrop(preset, sw, sh);
  return defaultAtlasTileStackPreset(sw, sh);
}
