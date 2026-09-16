import { describe, expect, it } from "vitest";
import { landmassById, HOME_LOCALS } from "@/components/world/world-landmasses";
import {
  campusMask,
  planetCliffHeight,
  planetColor,
  planetSurfaceHeight,
} from "@/components/world/planet-terrain";
import { wrapAuthoredOffset } from "@/components/world/sphere-wrap";

describe("grass planet", () => {
  const home = landmassById("home")!;

  it("keeps house, school, and pet on a low meadow", () => {
    for (const local of Object.values(HOME_LOCALS)) {
      const pose = wrapAuthoredOffset(home.lat, home.lon, local.localX, local.localZ, home.yaw, home.unitsToRadians);
      expect(campusMask(pose.lat, pose.lon)).toBeGreaterThan(0.85);
      expect(planetCliffHeight(pose.lat, pose.lon)).toBeLessThan(0.01);
      expect(planetSurfaceHeight(pose.lat, pose.lon)).toBeLessThan(0.025);
      const [r, g, b] = planetColor(pose.lat, pose.lon);
      expect(g).toBeGreaterThan(r);
      expect(g).toBeGreaterThan(b);
    }
  });

  it("raises rock cliffs away from campus", () => {
    expect(planetCliffHeight(34, 108)).toBeGreaterThan(0.05);
    expect(planetCliffHeight(-46, -98)).toBeGreaterThan(0.04);
    const [r, g, b] = planetColor(34, 108);
    expect(r).toBeGreaterThan(g * 0.7);
    expect(g).toBeLessThan(0.55);
    expect(b).toBeLessThan(g + 0.05);
  });
});
