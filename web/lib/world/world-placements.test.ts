import { describe, expect, it } from "vitest";
import { mergeWorldPlacements } from "@/components/world/world-placement-storage";
import { DEFAULT_WORLD_PLACEMENTS } from "@/components/world/world-placements";

describe("mergeWorldPlacements", () => {
  it("keeps authored ids and applies stored offsets", () => {
    const merged = mergeWorldPlacements([
      { id: "home-cottage", localX: 0.4, localZ: -0.1, scale: 0.25, yaw: 0.5 },
      { id: "unknown-building", localX: 9, localZ: 9 },
    ]);
    const cottage = merged.find((item) => item.id === "home-cottage");
    expect(cottage?.localX).toBe(0.4);
    expect(cottage?.localZ).toBe(-0.1);
    expect(cottage?.scale).toBe(0.25);
    expect(cottage?.yaw).toBe(0.5);
    expect(merged.some((item) => item.id === "unknown-building")).toBe(false);
    expect(merged).toHaveLength(DEFAULT_WORLD_PLACEMENTS.length);
  });
});
