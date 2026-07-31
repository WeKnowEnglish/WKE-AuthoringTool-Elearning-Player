import { describe, expect, it } from "vitest";
import { HOMEWORK_STUDIO_FORMATS } from "@/lib/class-homework/types";
import {
  createPictureStoryDraft,
  isPictureStoryAnswerCorrect,
  pictureStoryDocumentSchema,
  pictureStoryValidationMessages,
} from "@/lib/activity-builder/reading/picture-story";

describe("Picture Story Reading activity", () => {
  it("creates a valid Primary picture story", () => {
    expect(pictureStoryDocumentSchema.safeParse(createPictureStoryDraft()).success).toBe(true);
  });
  it("requires at least three frames", () => {
    const draft = createPictureStoryDraft();
    draft.content.frames = draft.content.frames.slice(0, 2);
    expect(pictureStoryValidationMessages(draft)).toContain("Add at least three story frames.");
  });
  it("requires questions to reference an existing frame", () => {
    const draft = createPictureStoryDraft();
    draft.content.questions[0]!.evidenceFrameId = "missing";
    expect(pictureStoryValidationMessages(draft)).toContain("Question 1 must point to a story frame.");
  });
  it("checks completion answers without case or punctuation penalties", () => {
    const question = createPictureStoryDraft().content.questions[0]!;
    expect(isPictureStoryAnswerCorrect(" Seed! ", question)).toBe(true);
  });
  it("remains outside the homework assignment allowlist", () => {
    expect(HOMEWORK_STUDIO_FORMATS).not.toContain("picture_story_reading");
  });
});
