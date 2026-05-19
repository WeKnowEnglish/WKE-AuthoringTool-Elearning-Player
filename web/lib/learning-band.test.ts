import { describe, expect, it } from "vitest";
import { isLearningBand, learningBandLabel } from "@/lib/learning-band";

describe("learning-band", () => {
  it("accepts a1, a2, b1 only", () => {
    expect(isLearningBand("a1")).toBe(true);
    expect(isLearningBand("a2")).toBe(true);
    expect(isLearningBand("b1")).toBe(true);
    expect(isLearningBand("pre_a1")).toBe(false);
    expect(isLearningBand("")).toBe(false);
    expect(isLearningBand(null)).toBe(false);
  });

  it("formats labels in uppercase", () => {
    expect(learningBandLabel("a1")).toBe("A1");
    expect(learningBandLabel("b1")).toBe("B1");
  });
});
