import { describe, expect, it } from "vitest";
import {
  checkQuestionWritingResponse,
  createSampleQuestionWritingDocument,
  isQuestionWritingActivityReady,
  isQuestionWritingPromptReady,
  questionWritingStubPack,
  validateQuestionWritingDocument,
} from "@/lib/question-writing";

describe("question writing module", () => {
  it("validates the HT1 sample", () => {
    const doc = createSampleQuestionWritingDocument();
    expect(doc.prompts).toHaveLength(5);
    expect(questionWritingStubPack(doc).kind).toBe("question-writing-pack");
  });

  it("checks question structure against required words", () => {
    const doc = createSampleQuestionWritingDocument();
    const prompt = doc.prompts[0]!;
    const pass = checkQuestionWritingResponse(
      "Have you ever swum in a river?",
      prompt,
    );
    expect(pass).toEqual({
      capitalLetter: true,
      questionMark: true,
      minimumWords: true,
      requiredWords: true,
      questionWord: true,
      helpingVerb: true,
      wordCount: 7,
    });
    expect(isQuestionWritingPromptReady(pass)).toBe(true);

    const fail = checkQuestionWritingResponse("swum river", prompt);
    expect(isQuestionWritingPromptReady(fail)).toBe(false);
  });

  it("reports activity readiness across all prompts", () => {
    const doc = createSampleQuestionWritingDocument();
    expect(isQuestionWritingActivityReady(doc, {})).toBe(false);
    expect(
      isQuestionWritingActivityReady(doc, {
        "question-1": "Have you ever swum in a river?",
        "question-2": "Have you ever painted a set?",
        "question-3": "Have you ever sung in a concert?",
        "question-4": "Have you ever ridden an elephant?",
        "question-5": "Have you ever made a cake?",
      }),
    ).toBe(true);
  });

  it("rejects empty prompt lists", () => {
    expect(() =>
      validateQuestionWritingDocument({
        version: 1,
        kind: "question-writing",
        id: "empty",
        title: "Empty",
        instructions: "Write.",
        workedExample: {
          prompt: "x",
          question: "Have you?",
          answer: "Yes.",
        },
        prompts: [],
      }),
    ).toThrow(/at least one prompt/);
  });
});
