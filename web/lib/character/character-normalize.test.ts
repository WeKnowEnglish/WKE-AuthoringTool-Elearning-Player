import { describe, expect, it } from "vitest";
import { DEFAULT_CHARACTER_CONFIG } from "./character-defaults";
import { normalizeCharacterConfig } from "./character-normalize";
import { randomCharacterConfig } from "./character-randomize";
import {
  WKE_GIRL_BASES,
  WKE_GIRL_HAIR,
  WKE_GIRL_OUTFITS,
  isWkeGirlBase,
  isWkeGirlHair,
  isWkeGirlOutfit,
} from "./wke-girl-assets";

describe("normalizeCharacterConfig", () => {
  it("returns the single WKE girl defaults for missing config", () => {
    expect(normalizeCharacterConfig(null)).toEqual(DEFAULT_CHARACTER_CONFIG);
    expect(normalizeCharacterConfig(undefined)).toEqual(DEFAULT_CHARACTER_CONFIG);
  });

  it("keeps a valid v2 saved config", () => {
    const saved = {
      ...DEFAULT_CHARACTER_CONFIG,
      hairColor: "#112233",
      outfitColor: "#445566",
    };
    expect(normalizeCharacterConfig(saved)).toEqual(saved);
  });

  it("rejects removed character seeds and part IDs", () => {
    const next = normalizeCharacterConfig({
      ...DEFAULT_CHARACTER_CONFIG,
      base: "seed_boy",
      hair: "hair_05",
      outfit: "top_03",
    });
    expect(next.base).toBe(DEFAULT_CHARACTER_CONFIG.base);
    expect(next.hair).toBe(DEFAULT_CHARACTER_CONFIG.hair);
    expect(next.outfit).toBe(DEFAULT_CHARACTER_CONFIG.outfit);
  });

  it("migrates useful colors from the former procedural loadout", () => {
    const next = normalizeCharacterConfig({
      body: "body_02",
      hair: "hair_09",
      skinColor: "#A56F50",
      hairColor: "#3B2618",
      topColor: "#635BFF",
      bottomColor: "#2B3A67",
    });
    expect(next.base).toBe(DEFAULT_CHARACTER_CONFIG.base);
    expect(next.skinColor).toBe("#A56F50");
    expect(next.hairColor).toBe("#3B2618");
    expect(next.outfitColor).toBe("#635BFF");
  });
});

describe("single WKE girl registry", () => {
  it("contains exactly one selectable base, hair, and outfit", () => {
    expect(WKE_GIRL_BASES).toHaveLength(1);
    expect(WKE_GIRL_HAIR).toHaveLength(1);
    expect(WKE_GIRL_OUTFITS).toHaveLength(1);
  });

  it("keeps randomization on the registered single avatar", () => {
    const next = randomCharacterConfig();
    expect(isWkeGirlBase(next.base)).toBe(true);
    expect(isWkeGirlHair(next.hair)).toBe(true);
    expect(isWkeGirlOutfit(next.outfit)).toBe(true);
  });
});
