import { describe, expect, it } from "vitest";
import {
  createSampleReadAndAnswerDocument,
  isReadAndAnswerMastered,
  readAndAnswerStubPack,
  scoreReadAndAnswerAnswers,
  validateReadAndAnswerDocument,
} from "@/lib/read-and-answer";

describe("read and answer module", () => {
  it("validates the sample", () => {
    const doc = createSampleReadAndAnswerDocument();
    expect(doc.questions).toHaveLength(3);
    expect(doc.passage.text.length).toBeGreaterThanOrEqual(40);
    expect(readAndAnswerStubPack(doc).kind).toBe("read-and-answer-pack");
    expect(readAndAnswerStubPack(doc).question_count).toBe(3);
  });

  it("scores perfect and imperfect answers", () => {
    const doc = createSampleReadAndAnswerDocument();
    const perfect = Object.fromEntries(
      doc.questions.map((question) => [question.id, question.correctOptionId]),
    );
    expect(
      isReadAndAnswerMastered(scoreReadAndAnswerAnswers(doc.questions, perfect)),
    ).toBe(true);

    const messy = {
      ...perfect,
      [doc.questions[0]!.id]: doc.questions[0]!.options.find(
        (option) => option.id !== doc.questions[0]!.correctOptionId,
      )!.id,
    };
    expect(
      isReadAndAnswerMastered(scoreReadAndAnswerAnswers(doc.questions, messy)),
    ).toBe(false);
  });

  it("rejects too few questions", () => {
    expect(() =>
      validateReadAndAnswerDocument({
        version: 1,
        kind: "read-and-answer",
        id: "short",
        title: "Short",
        instructions: "Read.",
        shuffleOptions: true,
        passage: {
          text: "This passage is long enough to pass the forty character minimum rule.",
        },
        questions: [
          {
            id: "q1",
            prompt: "One?",
            options: [
              { id: "a", text: "Yes" },
              { id: "b", text: "No" },
            ],
            correctOptionId: "a",
          },
          {
            id: "q2",
            prompt: "Two?",
            options: [
              { id: "a", text: "Yes" },
              { id: "b", text: "No" },
            ],
            correctOptionId: "b",
          },
        ],
      }),
    ).toThrow(/at least 3 questions/);
  });
});
