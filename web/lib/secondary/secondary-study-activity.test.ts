import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSecondarySentenceEligibleWordIds } from "@/lib/secondary/secondary-sentence-word-set";
import {
  buildSecondaryActivityAvailabilityCounts,
  buildSecondaryLearnPracticeHref,
  isSecondaryActivityAvailableToday,
  parseSecondaryLearnActivityParam,
  resolveSecondaryNextActivityKey,
  resolveSecondaryStudyActivityHref,
  resolveSecondaryStudyActivityKey,
} from "@/lib/secondary/secondary-study-activity";

vi.mock("@/lib/secondary/secondary-cloze-compiler", () => ({
  compileSecondaryClozeFromWordIds: vi.fn(() => ({ blankWordItemIds: ["w1", "w2"] })),
}));

vi.mock("@/lib/secondary/secondary-practice-types", () => ({
  countSecondaryActivityEligibleWords: vi.fn((_ids: string[], type: string) => {
    if (type === "match") return 3;
    if (type === "spelling") return 3;
    return 0;
  }),
}));

vi.mock("@/lib/secondary/secondary-sentence-word-set", () => ({
  getSecondarySentenceEligibleWordIds: vi.fn(() => ["s1"]),
}));

const baseCtx = {
  sessionWordIds: ["w1", "w2", "w3"],
  dateKey: "2026-07-10",
  studentId: "student-a",
  completion: {},
};

describe("secondary-study-activity", () => {
  beforeEach(() => {
    vi.mocked(getSecondarySentenceEligibleWordIds).mockReturnValue(["s1"]);
  });

  it("builds availability counts", () => {
    const counts = buildSecondaryActivityAvailabilityCounts(baseCtx);
    expect(counts.match).toBe(3);
    expect(counts.cloze).toBe(2);
    expect(counts.spelling).toBe(3);
    expect(counts.sentence).toBe(1);
    expect(counts.hasWordsToday).toBe(true);
  });

  it("returns first incomplete activity", () => {
    expect(resolveSecondaryNextActivityKey(baseCtx)).toBe("match");
    expect(
      resolveSecondaryNextActivityKey({
        ...baseCtx,
        completion: { match: { completed: true, percent: 100, completedAt: "" } },
      }),
    ).toBe("cloze");
  });

  it("returns null when all complete", () => {
    expect(
      resolveSecondaryNextActivityKey({
        ...baseCtx,
        completion: {
          match: { completed: true, percent: 100, completedAt: "" },
          cloze: { completed: true, percent: 100, completedAt: "" },
          spelling: { completed: true, percent: 100, completedAt: "" },
          sentence: { completed: true, percent: 100, completedAt: "" },
        },
      }),
    ).toBeNull();
  });

  it("study key replays first available when all complete", () => {
    expect(
      resolveSecondaryStudyActivityKey({
        ...baseCtx,
        completion: {
          match: { completed: true, percent: 100, completedAt: "" },
          cloze: { completed: true, percent: 100, completedAt: "" },
          spelling: { completed: true, percent: 100, completedAt: "" },
          sentence: { completed: true, percent: 100, completedAt: "" },
        },
      }),
    ).toBe("match");
  });

  it("resolves study href to Learn Practice with activity seed", () => {
    expect(resolveSecondaryStudyActivityHref(baseCtx)).toBe("/secondary/learn?activity=match");
    expect(
      resolveSecondaryStudyActivityHref({
        ...baseCtx,
        completion: { match: { completed: true, percent: 100, completedAt: "" } },
      }),
    ).toBe("/secondary/learn?activity=cloze");
  });

  it("falls back to Learn Practice when nothing available", () => {
    vi.mocked(getSecondarySentenceEligibleWordIds).mockReturnValue([]);
    expect(
      resolveSecondaryStudyActivityHref({
        ...baseCtx,
        sessionWordIds: [],
      }),
    ).toBe("/secondary/learn");
  });

  it("builds and parses Learn Practice activity query", () => {
    expect(buildSecondaryLearnPracticeHref()).toBe("/secondary/learn");
    expect(buildSecondaryLearnPracticeHref("spelling")).toBe(
      "/secondary/learn?activity=spelling",
    );
    expect(parseSecondaryLearnActivityParam("cloze")).toBe("cloze");
    expect(parseSecondaryLearnActivityParam("nope")).toBeNull();
  });

  it("sentence available without session words", () => {
    const counts = buildSecondaryActivityAvailabilityCounts({
      sessionWordIds: [],
      dateKey: "2026-07-10",
      studentId: "student-a",
    });
    expect(isSecondaryActivityAvailableToday("sentence", counts)).toBe(true);
    expect(isSecondaryActivityAvailableToday("match", counts)).toBe(false);
  });
});
