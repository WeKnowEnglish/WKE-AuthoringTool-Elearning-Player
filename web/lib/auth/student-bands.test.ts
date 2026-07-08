import { describe, expect, it } from "vitest";
import {
  getSecondaryEligibleBands,
  isSecondaryEligibleBand,
  resolveLearningBand,
} from "@/lib/auth/student-bands";

describe("student-bands", () => {
  it("resolves known learning bands", () => {
    expect(resolveLearningBand("a1")).toBe("a1");
    expect(resolveLearningBand("a2")).toBe("a2");
    expect(resolveLearningBand("b1")).toBe("b1");
  });

  it("rejects unknown or empty band values", () => {
    expect(resolveLearningBand(null)).toBeNull();
    expect(resolveLearningBand(undefined)).toBeNull();
    expect(resolveLearningBand("A2")).toBeNull();
    expect(resolveLearningBand("c1")).toBeNull();
    expect(resolveLearningBand(2)).toBeNull();
  });

  it("marks only Secondary track (a2) as secondary-eligible", () => {
    expect(isSecondaryEligibleBand("a2")).toBe(true);
    expect(isSecondaryEligibleBand("a1")).toBe(false);
    expect(isSecondaryEligibleBand("b1")).toBe(false);
    expect(isSecondaryEligibleBand(null)).toBe(false);
    expect(getSecondaryEligibleBands()).toEqual(["a2"]);
  });
});
