import { describe, expect, it } from "vitest";
import { HOMEWORK_STUDIO_FORMATS } from "@/lib/class-homework/types";
import { clozeOpenDocumentSchema, clozeOpenValidationMessages, createClozeOpenDraft, isOpenClozeAnswerCorrect } from "@/lib/activity-builder/reading/cloze-open";

describe("Open Cloze activity", () => {
  it("creates a valid Primary draft", () => {
    expect(clozeOpenDocumentSchema.safeParse(createClozeOpenDraft()).success).toBe(true);
  });

  it("accepts capitalization, surrounding spaces, and punctuation by default", () => {
    const draft = createClozeOpenDraft();
    const gap = draft.content.segments.find((segment) => segment.type === "gap");
    expect(gap?.type === "gap" && isOpenClozeAnswerCorrect("  GARDEN! ", gap, draft.content)).toBe(true);
  });

  it("supports accepted answer alternatives", () => {
    const draft = createClozeOpenDraft();
    const gap = draft.content.segments.find((segment) => segment.type === "gap");
    if (gap?.type === "gap") gap.correctAnswers.push("school garden");
    expect(gap?.type === "gap" && isOpenClozeAnswerCorrect("school garden", gap, draft.content)).toBe(true);
  });

  it("requires three to five gaps", () => {
    const draft = createClozeOpenDraft();
    draft.content.segments = draft.content.segments.filter((segment, index) => segment.type !== "gap" || index === 1 || index === 3);
    expect(clozeOpenValidationMessages(draft)).toContain("Open Cloze requires three to five gaps.");
  });

  it("remains outside the homework assignment allowlist", () => {
    expect(HOMEWORK_STUDIO_FORMATS).not.toContain("reading_cloze_open");
  });
});
