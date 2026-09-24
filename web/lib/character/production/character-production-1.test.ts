import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { buildHeroObject, disposeHeroObject } from "../kit/build-hero-object";
import { normalizeCharacterKit } from "../kit/kit-normalize";
import { normalizeCharacterConfig } from "../character-normalize";
import {
  CHARACTER_PRODUCTION_1_CONFIG,
  CHARACTER_PRODUCTION_1_ID,
  CHARACTER_PRODUCTION_1_KIT,
  CHARACTER_PRODUCTION_1_NAME,
} from "./character-production-1";

describe("Character Production 1", () => {
  it("locks a named vinyl kit and body loadout", () => {
    const kit = normalizeCharacterKit(CHARACTER_PRODUCTION_1_KIT);
    const config = normalizeCharacterConfig(CHARACTER_PRODUCTION_1_CONFIG);
    expect(kit.id).toBe(CHARACTER_PRODUCTION_1_ID);
    expect(kit.name).toBe(CHARACTER_PRODUCTION_1_NAME);
    expect(kit.hero).toBe("toy_head_v1");
    expect(kit.sculpts?.map((stroke) => stroke.id)).toEqual([
      "chin_pad",
      "cheek_pad",
      "jaw_round",
      "brow_smooth",
    ]);
    expect(kit.hair.tufts.length).toBeGreaterThanOrEqual(4);
    expect(config.top).toBe("top_02");
    expect(config.bottom).toBe("bottom_01");
    expect(config.accessory).toBeNull();
  });

  it("builds a named skull the production figure can attach", () => {
    const group = buildHeroObject(CHARACTER_PRODUCTION_1_KIT);
    expect(group.name).toBe("characterKitHead");
    expect(group.getObjectByName("heroSkull")).toBeTruthy();
    expect(group.getObjectByName("kitHair")).toBeTruthy();
    const size = new Box3().setFromObject(group).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(1.2);
    disposeHeroObject(group);
  });
});
