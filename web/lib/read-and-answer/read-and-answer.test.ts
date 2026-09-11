import { describe, expect, it } from "vitest";
import {
  asReadAndAnswerDraft,
  cloneReadAndAnswerDocumentForAuthoring,
  createBlankReadAndAnswerDocument,
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

  it("does not treat a blank starter as assignable", () => {
    const blank = createBlankReadAndAnswerDocument();
    expect(blank.questions).toHaveLength(3);
    expect(blank.title).not.toBe("A Busy Saturday");
    expect(blank.passage.text).toBe("");
    expect(() => validateReadAndAnswerDocument(blank)).toThrow();
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

  it("keeps incomplete drafts editable and remaps sample ids on clone", () => {
    const fromEmpty = asReadAndAnswerDraft({});
    expect(fromEmpty.questions).toHaveLength(3);
    expect(fromEmpty.passage.text).toBe("");
    expect(asReadAndAnswerDraft({}).questions[0]!.id).toBe(fromEmpty.questions[0]!.id);

    const sample = createSampleReadAndAnswerDocument();
    const clone = cloneReadAndAnswerDocumentForAuthoring(sample);
    expect(clone.id).not.toBe(sample.id);
    expect(clone.questions[0]!.id).not.toBe(sample.questions[0]!.id);
    expect(clone.questions[0]!.options[0]!.id).not.toBe(sample.questions[0]!.options[0]!.id);
    expect(validateReadAndAnswerDocument(clone).passage.text).toBe(sample.passage.text);
  });
});
