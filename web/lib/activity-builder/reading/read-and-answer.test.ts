import { describe, expect, it } from "vitest";
import { HOMEWORK_STUDIO_FORMATS } from "@/lib/class-homework/types";
import {
  createReadAndAnswerDraft,
  readAndAnswerDocumentSchema,
  readAndAnswerValidationMessages,
} from "@/lib/activity-builder/reading/read-and-answer";

describe("Read and Answer activity", () => {
  it("creates a valid three-question Primary draft", () => {
    expect(readAndAnswerDocumentSchema.safeParse(createReadAndAnswerDraft()).success).toBe(true);
  });

  it("requires three to five questions", () => {
    const draft = createReadAndAnswerDraft();
    draft.content.questions = draft.content.questions.slice(0, 2);
    expect(readAndAnswerValidationMessages(draft)).toContain("Add at least three comprehension questions.");
  });

  it("requires image alternative text when an image is used", () => {
    const draft = createReadAndAnswerDraft();
    draft.content.passage.imageUrl = "https://example.com/story.png";
    draft.content.passage.imageAlt = "";
    expect(readAndAnswerValidationMessages(draft)).toContain("Add alternative text for the passage image.");
  });

  it("requires the correct answer to exist in the choices", () => {
    const draft = createReadAndAnswerDraft();
    draft.content.questions[0]!.correctOptionId = "missing";
    expect(readAndAnswerValidationMessages(draft)).toContain("Question 1 needs a correct answer.");
  });

  it("remains outside the homework assignment allowlist", () => {
    expect(HOMEWORK_STUDIO_FORMATS).not.toContain("reading_comprehension_mc");
  });
});
