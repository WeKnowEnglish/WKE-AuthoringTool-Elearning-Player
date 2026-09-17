import { describe, expect, it } from "vitest";
import { STARTER_HOUSE } from "./house-normalize";
import { ensureWardrobe, nearestWardrobeApproach, wardrobeApproach, wardrobeItems } from "./house-specials";
import { canPlaceItem } from "./house-grid";

describe("house specials", () => {
  it("puts a wardrobe in the starter room", () => {
    expect(wardrobeItems(STARTER_HOUSE)).toHaveLength(1);
    expect(STARTER_HOUSE.items.some((item) => item.kind === "wardrobe")).toBe(true);
  });

  it("lets the starter wardrobe sit opposite the fridge", () => {
    const wardrobe = STARTER_HOUSE.items.find((item) => item.kind === "wardrobe")!;
    expect(canPlaceItem(STARTER_HOUSE.items.filter((item) => item.id !== wardrobe.id), wardrobe)).toBeNull();
  });

  it("stands the player in front of the wardrobe doors", () => {
    const wardrobe = STARTER_HOUSE.items.find((item) => item.kind === "wardrobe")!;
    const approach = wardrobeApproach(wardrobe);
    expect(approach.x).toBeGreaterThan(wardrobe.x);
    expect(nearestWardrobeApproach(STARTER_HOUSE, approach.x, approach.z)).toEqual(approach);
  });

  it("adds a wardrobe to older fridge-only rooms", () => {
    const old = {
      ...STARTER_HOUSE,
      items: STARTER_HOUSE.items.filter((item) => item.kind === "fridge"),
    };
    const next = ensureWardrobe(old);
    expect(wardrobeItems(next)).toHaveLength(1);
  });
});
