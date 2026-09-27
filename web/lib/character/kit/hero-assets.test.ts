import { describe, expect, it } from "vitest";
import { findHero, heroGlbPublicSrc, isRegisteredHero } from "./hero-assets";
import { normalizeCharacterKit } from "./kit-normalize";

describe("hero assets", () => {
  it("keeps the image-to-3D slot and rejects unknown heroes", () => {
    expect(isRegisteredHero("hero_kid_v1")).toBe(true);
    expect(isRegisteredHero("chibi_bust_v1")).toBe(true);
    expect(isRegisteredHero("seed_boy")).toBe(true);
    expect(isRegisteredHero("seed_boy_head")).toBe(true);
    expect(findHero("seed_boy_head").tintHair).toBeFalsy();
    expect(findHero("seed_boy_head").hasSeparateHair).toBeFalsy();
    expect(findHero("seed_boy").src).toBe("/characters/heroes/seed_boy.glb");
    expect(findHero("hero_kid_v1").src).toBe("/characters/heroes/hero_kid_v1.glb");
    expect(heroGlbPublicSrc("hero_kid_v1")).toBe("/characters/heroes/hero_kid_v1.glb");
    expect(normalizeCharacterKit({ hero: "hero_kid_v1" }).hero).toBe("hero_kid_v1");
    expect(normalizeCharacterKit({ hero: "blender_head" }).hero).toBe("toy_head_v1");
  });
});
