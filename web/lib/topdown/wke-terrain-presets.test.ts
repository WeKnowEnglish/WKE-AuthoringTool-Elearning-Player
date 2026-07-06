import { describe, expect, it } from "vitest";
import type { AtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import { walkBottom } from "@/lib/topdown/atlas-tile-layout";
import {
  buildWkeFullCropPreset,
  listWkeTerrainTileIds,
  WKE_TERRAIN_TILE_STACK_PRESETS,
} from "@/lib/topdown/wke-terrain-tile-presets";
import { WKE_TERRAIN_SPRITE_ATLAS, type WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

const TUNED_LAYOUTS: Partial<Record<WkeTerrainTileId, AtlasTileStackPreset["layout"]>> = {
  wke_grass_plain: { logicalTilePx: 58, lipOverlapPx: 2, columnOverlapPx: 0 },
  wke_grass_flowers: { logicalTilePx: 58, lipOverlapPx: 1, columnOverlapPx: 0 },
  wke_grass_edge: { logicalTilePx: 64, lipOverlapPx: 1, columnOverlapPx: 0 },
  wke_grass_corner: { logicalTilePx: 64, lipOverlapPx: 4, columnOverlapPx: 0 },
  wke_grass_plain_2: { logicalTilePx: 64, lipOverlapPx: 2, columnOverlapPx: 0 },
};

describe("wke-terrain-tile-presets", () => {
  const tileIds = listWkeTerrainTileIds();

  it("covers every atlas asset", () => {
    const atlasIds = Object.keys(WKE_TERRAIN_SPRITE_ATLAS.assets) as WkeTerrainTileId[];
    expect(tileIds.sort()).toEqual(atlasIds.sort());
  });

  it("keeps walk and lip inside atlas crop bounds", () => {
    for (const assetId of tileIds) {
      const bounds = WKE_TERRAIN_SPRITE_ATLAS.assets[assetId];
      const preset = WKE_TERRAIN_TILE_STACK_PRESETS[assetId];
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
      const bounds = WKE_TERRAIN_SPRITE_ATLAS.assets[assetId];
      const preset = WKE_TERRAIN_TILE_STACK_PRESETS[assetId];
      expect(preset.walk.insetX).toBe(0);
      expect(preset.walk.width).toBe(bounds.sw);
    }
  });

  it("keeps lip overlap below logical tile size", () => {
    for (const assetId of tileIds) {
      const { layout } = WKE_TERRAIN_TILE_STACK_PRESETS[assetId];
      expect(layout.lipOverlapPx).toBeLessThan(layout.logicalTilePx);
    }
  });

  it("preserves manually tuned grass layouts", () => {
    for (const [assetId, layout] of Object.entries(TUNED_LAYOUTS) as [
      WkeTerrainTileId,
      AtlasTileStackPreset["layout"],
    ][]) {
      expect(WKE_TERRAIN_TILE_STACK_PRESETS[assetId].layout).toEqual(layout);
    }
  });

  it("buildWkeFullCropPreset matches grass reference lip band", () => {
    const plain = buildWkeFullCropPreset(100, 104, "plain");
    expect(plain.walk).toEqual({ insetX: 0, insetY: 0, width: 100, height: 95 });
    expect(plain.lipStartY).toBe(95);

    const prop = buildWkeFullCropPreset(99, 104, "prop");
    expect(prop.walk.insetY).toBe(1);
    expect(prop.lipStartY).toBe(95);
  });
});
