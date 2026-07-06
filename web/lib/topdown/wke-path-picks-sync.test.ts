import { describe, expect, it } from "vitest";
import { WKE_PATH_SPRITE_ATLAS } from "@/lib/topdown/wke-sprite-atlas";
import { buildWkePathFullCropPreset } from "@/lib/topdown/wke-path-tile-presets";
import {
  normalizeWkePathPicksPayload,
  patchWkePathTilePresets,
  patchWkeSpriteAtlasPathAssets,
  type WkePathPicksPayload,
} from "@/lib/topdown/wke-path-picks-sync";
import { listWkePathTileIds } from "@/lib/topdown/wke-path-tile-presets";

describe("wke-path-picks-sync", () => {
  it("requires all 16 path tiles", () => {
    const payload: WkePathPicksPayload = {
      tiles: listWkePathTileIds().slice(0, 1).map((assetId) => ({
        assetId,
        bounds: WKE_PATH_SPRITE_ATLAS.assets[assetId],
        stack: buildWkePathFullCropPreset(300, 300),
      })),
    };
    expect(() => normalizeWkePathPicksPayload(payload)).toThrow(/Missing path tile picks/);
  });

  it("patches atlas and preset source blocks", () => {
    const picks = listWkePathTileIds().map((assetId) => {
      const bounds = WKE_PATH_SPRITE_ATLAS.assets[assetId];
      return {
        assetId,
        bounds: { ...bounds, sx: bounds.sx + 1 },
        stack: buildWkePathFullCropPreset(bounds.sw, bounds.sh),
      };
    });

    const atlasSource = patchWkeSpriteAtlasPathAssets(
      `export const WKE_PATH_SPRITE_ATLAS = {
  imageSrc: "/assets/wke/dirt-on-grass-path.png",
  width: 1254,
  height: 1254,
  assets: {
    path_r0c0: { sx: 0, sy: 0, sw: 1, sh: 1 },
  },
} as const satisfies SpriteAtlasConfig;`,
      picks,
    );
    expect(atlasSource).toContain("path_r0c0: { sx: 13");

    const presetSource = patchWkePathTilePresets(
      `export const WKE_PATH_TILE_STACK_PRESETS: Record<WkePathTileId, AtlasTileStackPreset> = {
  path_r0c0: presetFromCrop("path_r0c0"),
};`,
      picks,
    );
    expect(presetSource).toContain("Hand-tuned from path atlas picks");
    expect(presetSource).toContain("path_r0c0: {");
    expect(presetSource).not.toContain("presetFromCrop");
  });
});
