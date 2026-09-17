import { describe, expect, it } from "vitest";
import {
  approachSpotLocal,
  enterHref,
  globeAngularDistance,
  nearestHomeSpot,
  spawnOnGlobe,
  stepOnGlobe,
} from "./globe-walk";
import { HOME_LOCALS } from "@/components/world/world-landmasses";

describe("globe walk", () => {
  it("steps north without leaving the sphere", () => {
    const start = spawnOnGlobe();
    const next = stepOnGlobe(start.lat, start.lon, 0, 1, 0.2);
    expect(globeAngularDistance(start.lat, start.lon, next.lat, next.lon)).toBeGreaterThan(0.15);
    expect(Math.abs(next.lat)).toBeLessThan(90);
  });

  it("finds the house when standing on its approach", () => {
    const spawn = spawnOnGlobe("cottage");
    expect(nearestHomeSpot(spawn.lat, spawn.lon, 0.2)).toBe("cottage");
  });

  it("keeps the approach closer to campus center than the building", () => {
    const house = HOME_LOCALS.cottage;
    const approach = approachSpotLocal("cottage");
    const houseLen = Math.hypot(house.localX, house.localZ);
    const approachLen = Math.hypot(approach.localX, approach.localZ);
    expect(approachLen).toBeLessThan(houseLen);
  });

  it("opens interiors from the globe and sends the pet to Games", () => {
    expect(enterHref("school")).toBe("/primary/world/play/school?inside=1");
    expect(enterHref("cottage", "pilot")).toBe("/pilots/world/play/cottage?inside=1");
    expect(enterHref("pet", "pilot")).toBe("/primary?nav=games");
  });
});
