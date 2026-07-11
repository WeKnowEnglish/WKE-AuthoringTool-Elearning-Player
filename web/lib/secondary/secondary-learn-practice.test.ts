import { describe, expect, it } from "vitest";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import {
  compileSecondaryLearnQuestions,
  SECONDARY_LEARN_TARGET_QUESTIONS,
} from "@/lib/secondary/secondary-learn-practice";

describe("secondary-learn-practice", () => {
  const subject = getSecondaryVocabItemById("g7-a2-school-life-subject");
  const sessionWordItemIds = [
    "g7-a2-school-life-subject",
    "g7-a2-school-life-science",
    "g7-a2-school-life-history",
    "g7-a2-school-life-library",
  ];

  it("builds three questions for a rich bank item", () => {
    expect(subject).toBeDefined();
    const questions = compileSecondaryLearnQuestions({
      item: subject!,
      sessionWordItemIds,
      studentId: "student-1",
      dateKey: "2026-07-09",
    });

    expect(questions).toHaveLength(SECONDARY_LEARN_TARGET_QUESTIONS);
    expect(questions.map((question) => question.kind)).toEqual(
      expect.arrayContaining(["meaning_mc"]),
    );
    for (const question of questions) {
      expect(question.choices.some((choice) => choice.isCorrect)).toBe(true);
      expect(question.choices.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("is deterministic for the same seed inputs", () => {
    expect(subject).toBeDefined();
    const first = compileSecondaryLearnQuestions({
      item: subject!,
      sessionWordItemIds,
      studentId: "student-1",
      dateKey: "2026-07-09",
      runSeed: "1",
    });
    const second = compileSecondaryLearnQuestions({
      item: subject!,
      sessionWordItemIds,
      studentId: "student-1",
      dateKey: "2026-07-09",
      runSeed: "1",
    });
    expect(second).toEqual(first);
  });

  it("reshuffles when runSeed changes", () => {
    expect(subject).toBeDefined();
    const first = compileSecondaryLearnQuestions({
      item: subject!,
      sessionWordItemIds,
      studentId: "student-1",
      dateKey: "2026-07-09",
      runSeed: "0",
    });
    const second = compileSecondaryLearnQuestions({
      item: subject!,
      sessionWordItemIds,
      studentId: "student-1",
      dateKey: "2026-07-09",
      runSeed: "1",
    });
    expect(second[0]?.choices.map((choice) => choice.id)).not.toEqual(
      first[0]?.choices.map((choice) => choice.id),
    );
  });

  it("includes a cloze question when tier A/B content exists", () => {
    expect(subject).toBeDefined();
    const questions = compileSecondaryLearnQuestions({
      item: subject!,
      sessionWordItemIds,
      dateKey: "2026-07-09",
    });
    expect(questions.some((question) => question.kind === "cloze_mc")).toBe(true);
  });

  it("uses the enriched unseen context for the School Life cloze question", () => {
    expect(subject).toBeDefined();
    const questions = compileSecondaryLearnQuestions({
      item: subject!,
      sessionWordItemIds,
      dateKey: "2026-07-09",
    });
    const cloze = questions.find((question) => question.kind === "cloze_mc");

    expect(cloze?.prompt).toBe("Art is the ____ I enjoy most this year.");
    expect(cloze?.prompt).not.toBe(subject?.sentenceFrame?.replace(/_{2,}/g, "____"));
  });
});
