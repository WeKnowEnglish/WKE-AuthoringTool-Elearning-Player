import { describe, expect, it } from "vitest";
import { DEFAULT_HOST } from "./puppets/default-host";
import {
  buildPivotPercentMap,
  formatPivotPercent,
  formatPivotsForSource,
  parsePivotPercent,
  pivotMapToRigPivots,
} from "./pivot-utils";

describe("pivot-utils", () => {
  it("parses and formats pivot percents", () => {
    expect(parsePivotPercent("72% 38%")).toEqual({ x: 72, y: 38 });
    expect(formatPivotPercent({ x: 72, y: 38 })).toBe("72% 38%");
  });

  it("builds map from default host", () => {
    const map = buildPivotPercentMap(DEFAULT_HOST);
    expect(map.upperArm.x).toBe(55);
    expect(map.head.y).toBe(40);
    expect(map.body.x).toBe(46);
  });

  it("formats source snippet", () => {
    const pivots = pivotMapToRigPivots(buildPivotPercentMap(DEFAULT_HOST));
    expect(formatPivotsForSource(pivots)).toContain("upperArm:");
  });
});
