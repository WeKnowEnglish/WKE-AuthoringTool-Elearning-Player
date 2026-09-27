import { describe, expect, it } from "vitest";
import { aimForSelection } from "@/components/world/world-aim";
import { selectionFromLandmass } from "@/components/world/world-landmasses";

describe("aimForSelection", () => {
  it("aims the school and house at different spots", () => {
    const house = selectionFromLandmass("home", "cottage");
    const school = selectionFromLandmass("home", "school");
    expect(house && school).toBeTruthy();
    if (!house || !school) return;
    const houseAim = aimForSelection(house);
    const schoolAim = aimForSelection(school);
    expect(Math.hypot(houseAim.lat - schoolAim.lat, houseAim.lon - schoolAim.lon)).toBeGreaterThan(4);
  });
});
