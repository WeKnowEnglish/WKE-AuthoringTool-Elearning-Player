import { describe, expect, it } from "vitest";
import {
  isLandingTrackBand,
  isLearningBand,
  LANDING_TRACK_BANDS,
  learningBandLabel,
} from "@/lib/learning-band";

describe("learning-band", () => {
  it("accepts a1, a2, b1 only", () => {
    expect(isLearningBand("a1")).toBe(true);
    expect(isLearningBand("a2")).toBe(true);
    expect(isLearningBand("b1")).toBe(true);
    expect(isLearningBand("pre_a1")).toBe(false);
    expect(isLearningBand("")).toBe(false);
    expect(isLearningBand(null)).toBe(false);
  });

  it("limits landing tracks to Primary and Secondary", () => {
    expect(LANDING_TRACK_BANDS).toEqual(["a1", "a2"]);
    expect(isLandingTrackBand("a1")).toBe(true);
    expect(isLandingTrackBand("a2")).toBe(true);
    expect(isLandingTrackBand("b1")).toBe(false);
  });

  it("formats track labels for students", () => {
    expect(learningBandLabel("a1")).toBe("Primary");
    expect(learningBandLabel("a2")).toBe("Secondary");
    expect(learningBandLabel("b1")).toBe("B1");
  });
});
