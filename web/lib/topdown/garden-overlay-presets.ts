import type { AtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import { clampStackPresetToCrop, defaultAtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import type { GardenOverlayPickerFrameId } from "@/lib/topdown/garden-sprite-atlas";

/** Manually tuned — do not overwrite via batch pass. */
const TUNED_OVERLAY_PRESETS: Partial<
  Record<GardenOverlayPickerFrameId, AtlasTileStackPreset>
> = {
  item_watering_can: {
    walk: { insetX: 0, insetY: 0, width: 244, height: 200 },
    lipStartY: 200,
    layout: { logicalTilePx: 63, lipOverlapPx: 11, columnOverlapPx: 0 },
  },
  item_fertilizer: {
    walk: { insetX: 0, insetY: 0, width: 194, height: 216 },
    lipStartY: 216,
    layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
  },
  weed_monster: {
    walk: { insetX: 0, insetY: 0, width: 267, height: 274 },
    lipStartY: 274,
    layout: { logicalTilePx: 64, lipOverlapPx: 0, columnOverlapPx: 0 },
  },
};

export function getGardenOverlayStackPreset(
  assetId: string,
  sw: number,
  sh: number,
): AtlasTileStackPreset {
  const preset = TUNED_OVERLAY_PRESETS[assetId as GardenOverlayPickerFrameId];
  if (preset) return clampStackPresetToCrop(preset, sw, sh);
  return defaultAtlasTileStackPreset(sw, sh);
}
