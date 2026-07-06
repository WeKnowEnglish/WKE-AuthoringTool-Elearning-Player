import { describe, expect, it } from "vitest";
import {
  getLetterFruitAtlas,
  LETTER_A_FRUIT_ATLAS,
  LETTER_FRUIT_STAGE_IDS,
  letterFruitStageForGrowth,
} from "@/lib/topdown/letter-fruit-atlas";
import { LETTER_FRUIT_SLUGS } from "@/lib/topdown/letter-fruit-variants";
import { LETTER_FRUIT_TUNED_BOUNDS } from "@/lib/topdown/letter-fruit-tuned-bounds";

describe("letter-fruit-atlas", () => {
  it("registers all 27 letter variants", () => {
    expect(LETTER_FRUIT_SLUGS).toHaveLength(27);
    expect(LETTER_FRUIT_SLUGS).toContain("j_green");
    expect(LETTER_FRUIT_SLUGS).toContain("j_red");
  });

  it("applies auto-detected crops for every letter stage", () => {
    expect(Object.keys(LETTER_FRUIT_TUNED_BOUNDS)).toHaveLength(27 * 5);
    for (const slug of LETTER_FRUIT_SLUGS) {
      const atlas = getLetterFruitAtlas(slug);
      for (const stage of LETTER_FRUIT_STAGE_IDS) {
        const key = `letter_${slug}_${stage}`;
        expect(atlas.assets[key]).toEqual(LETTER_FRUIT_TUNED_BOUNDS[key as keyof typeof LETTER_FRUIT_TUNED_BOUNDS]);
      }
    }
  });

  it("keeps Letter A sheet dimensions", () => {
    expect(LETTER_FRUIT_STAGE_IDS).toHaveLength(5);
    expect(LETTER_A_FRUIT_ATLAS.width).toBe(1536);
    expect(LETTER_A_FRUIT_ATLAS.assets.letter_a_seed.sh).toBeGreaterThan(0);
    expect(LETTER_A_FRUIT_ATLAS.assets.letter_a_ripe.sw).toBeGreaterThan(300);
  });

  it("maps garden growth stages to letter fruit art", () => {
    expect(letterFruitStageForGrowth("empty", 0)).toBeNull();
    expect(letterFruitStageForGrowth("ready", 1)).toBe("ripe");
    expect(letterFruitStageForGrowth("sprout", 0.05)).toBe("seed");
    expect(letterFruitStageForGrowth("sprout", 0.2)).toBe("sprout");
    expect(letterFruitStageForGrowth("sprout", 0.5)).toBe("young");
    expect(letterFruitStageForGrowth("growing", 0.7)).toBe("young");
    expect(letterFruitStageForGrowth("growing", 0.9)).toBe("growing");
  });
});
