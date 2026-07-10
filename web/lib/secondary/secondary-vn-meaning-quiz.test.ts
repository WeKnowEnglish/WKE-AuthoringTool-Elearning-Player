import { describe, expect, it } from "vitest";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import {
  compileSecondaryVnMeaningQuiz,
  secondaryVnMeaningQuizEvidenceMeta,
} from "@/lib/secondary/secondary-vn-meaning-quiz";

describe("secondary-vn-meaning-quiz", () => {
  const subject = getSecondaryVocabItemById("g7-a2-school-life-subject");
  const sessionWordItemIds = [
    "g7-a2-school-life-subject",
    "g7-a2-school-life-science",
    "g7-a2-school-life-history",
    "g7-a2-school-life-library",
  ];

  it("builds a shuffled Vietnamese meaning quiz from session peers", () => {
    expect(subject).toBeDefined();
    const choices = compileSecondaryVnMeaningQuiz({
      item: subject!,
      sessionWordItemIds,
      studentId: "student-1",
      dateKey: "2026-07-10",
      runSeed: "0",
    });

    expect(choices).not.toBeNull();
    expect(choices!.length).toBeGreaterThanOrEqual(3);
    expect(choices!.filter((choice) => choice.isCorrect)).toHaveLength(1);
    expect(choices!.find((choice) => choice.isCorrect)?.label).toBe(subject!.vnMeaning);
  });

  it("returns null when there are not enough Vietnamese distractors", () => {
    expect(subject).toBeDefined();
    const choices = compileSecondaryVnMeaningQuiz({
      item: subject!,
      sessionWordItemIds: ["g7-a2-school-life-subject", "g7-a2-school-life-science"],
      studentId: "student-1",
      dateKey: "2026-07-10",
    });

    expect(choices).toBeNull();
  });

  it("reduces first-try bonus as attempts increase", () => {
    expect(secondaryVnMeaningQuizEvidenceMeta(0)).toEqual({ firstTry: true, attempts: 1 });
    expect(secondaryVnMeaningQuizEvidenceMeta(1)).toEqual({ firstTry: false, attempts: 2 });
    expect(secondaryVnMeaningQuizEvidenceMeta(2)).toEqual({ firstTry: false, attempts: 3 });
  });
});
