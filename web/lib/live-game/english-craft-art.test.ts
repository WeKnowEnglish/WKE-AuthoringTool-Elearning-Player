import { describe, expect, it } from "vitest";
import {
  ENGLISH_CRAFT_ART,
  resolveCarryArt,
  resolveResourceNodeArt,
  resolveStorageArt,
} from "@/lib/live-game/modes/english-craft/english-craft-art";

describe("english-craft art registry", () => {
  it("points every art entry at the Live Games asset folder", () => {
    for (const src of Object.values(ENGLISH_CRAFT_ART)) {
      expect(src.startsWith("/assets/Live%20Games%20Art%20Assets/")).toBe(true);
      expect(src.length).toBeGreaterThan(20);
    }
  });

  it("resolves storage fill sprites per resource type", () => {
    const woodEmpty = resolveStorageArt("wood", "empty");
    const woodHalf = resolveStorageArt("wood", "half");
    const woodFull = resolveStorageArt("wood", "full");
    expect(new Set([woodEmpty, woodHalf, woodFull]).size).toBe(3);

    for (const type of ["stone", "wheat", "cotton"] as const) {
      const levels = ["empty", "half", "full"] as const;
      const urls = levels.map((level) => resolveStorageArt(type, level));
      expect(new Set(urls).size).toBe(3);
    }
  });

  it("resolves harvest node sprites for available and depleted states", () => {
    for (const type of ["wood", "stone", "wheat", "cotton"] as const) {
      expect(resolveResourceNodeArt(type, false)).not.toBe(resolveResourceNodeArt(type, true));
    }
  });

  it("resolves carry sprites for each resource type", () => {
    const carryUrls = ["wood", "stone", "wheat", "cotton"].map((type) => resolveCarryArt(type));
    expect(new Set(carryUrls).size).toBe(4);
  });

  it("registers milestone craft and inventory art", () => {
    expect(ENGLISH_CRAFT_ART.hammer).toContain("hammer.png");
    expect(ENGLISH_CRAFT_ART.boat).toContain("boat.png");
    expect(ENGLISH_CRAFT_ART.backpack).toContain("backpack.png");
  });
});
