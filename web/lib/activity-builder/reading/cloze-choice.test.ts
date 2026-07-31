import { describe, expect, it } from "vitest";
import { HOMEWORK_STUDIO_FORMATS } from "@/lib/class-homework/types";
import { clozeChoiceDocumentSchema, clozeChoiceValidationMessages, createClozeChoiceDraft } from "@/lib/activity-builder/reading/cloze-choice";

describe("Cloze with Choices activity", () => {
  it("creates a valid five-gap Primary draft", () => {
    expect(clozeChoiceDocumentSchema.safeParse(createClozeChoiceDraft()).success).toBe(true);
  });

  it("requires exactly five gaps", () => {
    const draft = createClozeChoiceDraft();
    draft.content.segments = draft.content.segments.filter((segment, index) => segment.type !== "gap" || index !== 1);
    expect(clozeChoiceValidationMessages(draft)).toContain("Cloze with Choices requires exactly five gaps.");
  });

  it("requires the correct answer to be one of the choices", () => {
    const draft = createClozeChoiceDraft();
    const firstGap = draft.content.segments.find((segment) => segment.type === "gap");
    if (firstGap?.type === "gap") firstGap.correctAnswer = "missing";
    expect(clozeChoiceValidationMessages(draft)).toContain("Gap 1 needs a correct answer from its choices.");
  });

  it("rejects duplicate choices", () => {
    const draft = createClozeChoiceDraft();
    const firstGap = draft.content.segments.find((segment) => segment.type === "gap");
    if (firstGap?.type === "gap") firstGap.options = ["early", "EARLY"];
    expect(clozeChoiceValidationMessages(draft)).toContain("Gap 1 has duplicate choices.");
  });

  it("remains outside the homework assignment allowlist", () => {
    expect(HOMEWORK_STUDIO_FORMATS).not.toContain("reading_cloze_choice");
  });
});
