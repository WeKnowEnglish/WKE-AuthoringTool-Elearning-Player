import { describe, expect, it } from "vitest";
import { HOME_NAV, WORLD_LANDMASSES } from "@/components/world/world-landmasses";

describe("home world", () => {
  it("keeps only Home and the three campus components", () => {
    expect(WORLD_LANDMASSES.map((landmass) => landmass.id)).toEqual(["home"]);
    expect(HOME_NAV.map((item) => item.spot)).toEqual(["cottage", "school", "pet"]);
  });
});
