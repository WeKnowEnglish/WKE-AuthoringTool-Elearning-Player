import { describe, expect, it } from "vitest";
import {
  listSelfStudyPacks,
  SELF_STUDY_LESSON_SLOTS,
  getSelfStudyPack,
} from "@/lib/self-study-packs";

describe("self-study pack catalog", () => {
  it("lists packs with the 8-lesson format", () => {
    const packs = listSelfStudyPacks();
    expect(packs.length).toBeGreaterThanOrEqual(1);
    expect(packs.every((p) => p.lessonCount === 8)).toBe(true);
    expect(SELF_STUDY_LESSON_SLOTS).toHaveLength(8);
  });

  it("includes breakfast bakery as the first draft pack", () => {
    const pack = getSelfStudyPack("breakfast-bakery");
    expect(pack?.status).toBe("draft");
    expect(pack?.title).toBe("Breakfast Bakery");
  });
});
