import { describe, expect, it } from "vitest";
import { normalizeHomeworkTemplateGrades, normalizeHomeworkTemplatePartGrade } from "@/lib/homework-templates/homework-template-review";

describe("homework template reviews", () => {
  it("normalizes bounded teacher grades", () => {
    expect(normalizeHomeworkTemplatePartGrade({ score: 2, maxScore: 3, feedback: " Clear answer. " })).toEqual({
      score: 2,
      maxScore: 3,
      feedback: "Clear answer.",
    });
    expect(normalizeHomeworkTemplatePartGrade({ score: 4, maxScore: 3 })).toBeNull();
  });

  it("ignores malformed grade rows", () => {
    expect(normalizeHomeworkTemplateGrades({ "secondary-part-1": { score: 3, maxScore: 4 }, bad: "no" })).toEqual({
      "secondary-part-1": { score: 3, maxScore: 4, feedback: "" },
    });
  });
});
