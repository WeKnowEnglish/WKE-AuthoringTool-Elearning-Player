import { describe, expect, it } from "vitest";
import { defaultSpriteGeometry } from "./sprites";

describe("defaultSpriteGeometry", () => {
  it("fits a wide sprite inside normalized scene bounds", () => {
    const rect = defaultSpriteGeometry(400, 200, 1600, 900);
    expect(rect.shape).toBe("rectangle");
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1);
  });
});
