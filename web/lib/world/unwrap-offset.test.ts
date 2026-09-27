import { describe, expect, it } from "vitest";
import { unwrapAuthoredOffset, wrapAuthoredOffset } from "@/components/world/sphere-wrap";

describe("unwrapAuthoredOffset", () => {
  it("round-trips a home-island offset", () => {
    const wrapped = wrapAuthoredOffset(-2, 0, 0.3, 0.12, 0.85, 0.78);
    const local = unwrapAuthoredOffset(-2, 0, wrapped.lat, wrapped.lon, 0.85, 0.78);
    expect(local.localX).toBeCloseTo(0.3, 2);
    expect(local.localZ).toBeCloseTo(0.12, 2);
  });
});
