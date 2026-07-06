import { describe, expect, it } from "vitest";
import { defaultAtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import {
  LETTER_A_FRUIT_ATLAS,
  listLetterAFruitAssetIds,
} from "@/lib/topdown/letter-fruit-atlas";
import {
  normalizeLetterFruitPicksPayload,
  patchLetterFruitAtlasAssets,
  patchLetterFruitOverlayPresets,
  type LetterFruitPicksPayload,
} from "@/lib/topdown/letter-fruit-picks-sync";

describe("letter-fruit-picks-sync", () => {
  it("requires all five letter A stages", () => {
    const assetId = listLetterAFruitAssetIds()[0];
    const payload: LetterFruitPicksPayload = {
      tiles: [
        {
          assetId,
          bounds: LETTER_A_FRUIT_ATLAS.assets[assetId],
          stack: defaultAtlasTileStackPreset(100, 100),
        },
      ],
    };
    expect(() => normalizeLetterFruitPicksPayload(payload)).toThrow(
      /Missing letter fruit picks/,
    );
  });

  it("patches atlas and preset source blocks", () => {
    const picks = listLetterAFruitAssetIds().map((assetId) => {
      const bounds = LETTER_A_FRUIT_ATLAS.assets[assetId];
      return {
        assetId,
        bounds: { ...bounds, sx: bounds.sx + 2 },
        stack: defaultAtlasTileStackPreset(bounds.sw, bounds.sh),
      };
    });

    const atlasSource = patchLetterFruitAtlasAssets(
      `export const LETTER_A_FRUIT_ATLAS = {
  imageSrc: "/assets/Letter%20Fruit%20Stages/Letter%20A%20Stages.png",
  width: 1536,
  height: 1024,
  assets: {
    letter_a_seed: { sx: 0, sy: 40, sw: 307, sh: 740 },
  },
} as const satisfies SpriteAtlasConfig;`,
      picks,
    );
    expect(atlasSource).toContain("letter_a_seed: { sx: 70");

    const presetSource = patchLetterFruitOverlayPresets(
      `const TUNED_LETTER_A_PRESETS: Partial<
  Record<LetterAFruitAssetKey, AtlasTileStackPreset>
> = {
  letter_a_seed: {
    walk: { insetX: 0, insetY: 0, width: 10, height: 10 },
    lipStartY: 10,
    layout: { logicalTilePx: 64, lipOverlapPx: 0, columnOverlapPx: 0 },
  },
};`,
      picks,
    );
    expect(presetSource).toContain("Hand-tuned from letter fruit atlas picks");
    expect(presetSource).toContain("letter_a_ripe: {");
  });
});
