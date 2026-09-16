import { describe, expect, it } from "vitest";
import { DEFAULT_CHARACTER_CONFIG } from "./character-defaults";
import { normalizeCharacterConfig } from "./character-normalize";
import { randomCharacterConfig } from "./character-randomize";
import { CHARACTER_ASSETS, isRegisteredPart } from "./character-assets";

describe("normalizeCharacterConfig", () => {
  it("returns defaults for missing config", () => {
    expect(normalizeCharacterConfig(null)).toEqual(DEFAULT_CHARACTER_CONFIG);
    expect(normalizeCharacterConfig(undefined)).toEqual(DEFAULT_CHARACTER_CONFIG);
  });

  it("keeps a valid saved config", () => {
    const saved = {
      ...DEFAULT_CHARACTER_CONFIG,
      hair: "hair_05",
      top: "top_03",
      accessory: "accessory_01",
    };
    expect(normalizeCharacterConfig(saved)).toEqual(saved);
  });

  it("falls back when a hairstyle id is removed", () => {
    expect(normalizeCharacterConfig({ ...DEFAULT_CHARACTER_CONFIG, hair: "hair_gone" }).hair).toBe(
      DEFAULT_CHARACTER_CONFIG.hair,
    );
  });

  it("treats none and null accessory as empty", () => {
    expect(normalizeCharacterConfig({ ...DEFAULT_CHARACTER_CONFIG, accessory: null }).accessory).toBeNull();
    expect(normalizeCharacterConfig({ accessory: "none" }).accessory).toBeNull();
  });

  it("fills incomplete config", () => {
    const next = normalizeCharacterConfig({ hair: "hair_01" });
    expect(next.body).toBe(DEFAULT_CHARACTER_CONFIG.body);
    expect(next.hair).toBe("hair_01");
    expect(next.top).toBe(DEFAULT_CHARACTER_CONFIG.top);
  });
});

describe("randomCharacterConfig", () => {
  it("only picks registered ids", () => {
    const next = randomCharacterConfig();
    expect(isRegisteredPart("body", next.body)).toBe(true);
    expect(isRegisteredPart("hair", next.hair)).toBe(true);
    expect(isRegisteredPart("face", next.face)).toBe(true);
    expect(isRegisteredPart("top", next.top)).toBe(true);
    expect(isRegisteredPart("bottom", next.bottom)).toBe(true);
    expect(isRegisteredPart("shoes", next.shoes)).toBe(true);
    if (next.accessory) {
      expect(isRegisteredPart("accessory", next.accessory)).toBe(true);
    }
  });

  it("has at least three options in the main mix-and-match slots", () => {
    expect(CHARACTER_ASSETS.hair.length).toBeGreaterThanOrEqual(3);
    expect(CHARACTER_ASSETS.top.length).toBeGreaterThanOrEqual(3);
    expect(CHARACTER_ASSETS.bottom.length).toBeGreaterThanOrEqual(3);
    expect(CHARACTER_ASSETS.shoes.length).toBeGreaterThanOrEqual(3);
  });
});
