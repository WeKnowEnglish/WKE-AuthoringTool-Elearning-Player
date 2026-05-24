import { describe, expect, it } from "vitest";
import { emptyPetSnapshot } from "@/lib/pet/defaults";
import {
  petBaselineMood,
  petMoodLine,
  PET_MOOD_LINE_THRESHOLD,
} from "@/lib/pet/mood";

describe("petBaselineMood", () => {
  it("returns sad when any meter is at the mood line threshold", () => {
    const snap = emptyPetSnapshot();
    snap.meters.happiness = PET_MOOD_LINE_THRESHOLD;
    expect(petBaselineMood(snap)).toBe("sad");
  });

  it("returns normal when all meters are above the threshold", () => {
    const snap = emptyPetSnapshot();
    snap.meters.hunger = PET_MOOD_LINE_THRESHOLD + 1;
    expect(petBaselineMood(snap)).toBe("normal");
  });
});

describe("petMoodLine", () => {
  it("matches baseline threshold", () => {
    const snap = emptyPetSnapshot();
    snap.meters.thirst = 20;
    expect(petMoodLine(snap)).toBe("Your pet feels thirsty!");
    expect(petBaselineMood(snap)).toBe("sad");
  });
});
