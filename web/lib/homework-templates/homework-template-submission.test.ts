import { describe, expect, it } from "vitest";
import { normalizeHomeworkTemplatePartSnapshot, normalizeHomeworkTemplateSubmissionContent } from "@/lib/homework-templates/homework-template-submission";

describe("homework template submissions", () => {
  it("keeps bounded student answers and scoring metadata", () => {
    expect(normalizeHomeworkTemplatePartSnapshot({ answers: { a: "A sentence.", bad: 4 }, correct: 1, total: 2 })).toEqual({ answers: { a: "A sentence." }, correct: 1, total: 2 });
  });

  it("normalizes a six-part review snapshot", () => {
    const content = normalizeHomeworkTemplateSubmissionContent({ schemaVersion: 99, parts: { "picture-writing": { answers: { prompt: "The children are playing." }, correct: null, total: 1 } } });
    expect(content).toEqual({ schemaVersion: 1, parts: { "picture-writing": { answers: { prompt: "The children are playing." }, correct: null, total: 1 } } });
  });
});
