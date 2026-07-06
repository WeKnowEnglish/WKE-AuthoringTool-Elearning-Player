import { describe, expect, it } from "vitest";
import { walkBottom } from "@/lib/topdown/atlas-tile-layout";
import {
  buildWkePathFullCropPreset,
  listWkePathTileIds,
  WKE_PATH_TILE_STACK_PRESETS,
} from "@/lib/topdown/wke-path-tile-presets";
import { WKE_PATH_SPRITE_ATLAS } from "@/lib/topdown/wke-sprite-atlas";

describe("wke-path-tile-presets", () => {
  const tileIds = listWkePathTileIds();

  it("covers every atlas asset", () => {
    const atlasIds = Object.keys(WKE_PATH_SPRITE_ATLAS.assets);
    expect(tileIds.sort()).toEqual(atlasIds.sort());
  });

  it("keeps walk and lip inside atlas crop bounds", () => {
    for (const assetId of tileIds) {
      const bounds = WKE_PATH_SPRITE_ATLAS.assets[assetId];
      const preset = WKE_PATH_TILE_STACK_PRESETS[assetId];
      const bottom = walkBottom(preset.walk);

      expect(preset.walk.insetX).toBeGreaterThanOrEqual(0);
      expect(preset.walk.insetY).toBeGreaterThanOrEqual(0);
      expect(preset.walk.insetX + preset.walk.width).toBeLessThanOrEqual(bounds.sw);
      expect(bottom).toBeLessThanOrEqual(bounds.sh);
      expect(preset.lipStartY).toBeGreaterThanOrEqual(bottom);
      expect(preset.lipStartY).toBeLessThanOrEqual(bounds.sh);
    }
  });

  it("uses full crop width for walk surface", () => {
    for (const assetId of tileIds) {
      const bounds = WKE_PATH_SPRITE_ATLAS.assets[assetId];
      const preset = WKE_PATH_TILE_STACK_PRESETS[assetId];
      expect(preset.walk.insetX).toBe(0);
      expect(preset.walk.width).toBe(bounds.sw);
    }
  });

  it("buildWkePathFullCropPreset scales lip band for 300px cells", () => {
    const preset = buildWkePathFullCropPreset(300, 300);
    expect(preset.walk).toEqual({ insetX: 0, insetY: 0, width: 300, height: 271 });
    expect(preset.lipStartY).toBe(271);
    expect(preset.layout.logicalTilePx).toBe(64);
  });
});
