import { describe, expect, it } from "vitest";
import {
  createSamplePictureStoryDocument,
  isPictureStoryMastered,
  pictureStoryStubPack,
  scorePictureStoryAnswers,
  validatePictureStoryDocument,
} from "@/lib/picture-story";

describe("picture story module", () => {
  it("validates the sample", () => {
    const doc = createSamplePictureStoryDocument();
    expect(doc.frames).toHaveLength(3);
    expect(doc.questions).toHaveLength(3);
    const pack = pictureStoryStubPack(doc);
    expect(pack.kind).toBe("picture-story-pack");
    expect(pack.question_count).toBe(3);
    expect(pack.frame_count).toBe(3);
  });

  it("scores perfect and imperfect answers", () => {
    const doc = createSamplePictureStoryDocument();
    const perfect: Record<string, string> = {
      q1: "seed",
      q2: "q2a",
      q3: "  Flower! ",
    };
    expect(
      isPictureStoryMastered(scorePictureStoryAnswers(doc.questions, perfect)),
    ).toBe(true);

    const messy = { ...perfect, q2: "q2b" };
    expect(
      isPictureStoryMastered(scorePictureStoryAnswers(doc.questions, messy)),
    ).toBe(false);
  });

  it("rejects too few frames", () => {
    expect(() =>
      validatePictureStoryDocument({
        version: 1,
        kind: "picture-story",
        id: "short",
        title: "Short",
        instructions: "Read.",
        allowStoryReviewDuringQuestions: true,
        frames: [
          {
            id: "f1",
            imageUrl: "https://placehold.co/640x400?text=1",
            imageAlt: "One",
            text: "First.",
          },
          {
            id: "f2",
            imageUrl: "https://placehold.co/640x400?text=2",
            imageAlt: "Two",
            text: "Second.",
          },
        ],
        questions: [
          {
            id: "q1",
            type: "sentence_completion",
            prompt: "Fill ____.",
            acceptedAnswers: ["a"],
            options: [],
            correctOptionId: "",
            evidenceFrameId: "f1",
          },
          {
            id: "q2",
            type: "sentence_completion",
            prompt: "Fill ____.",
            acceptedAnswers: ["b"],
            options: [],
            correctOptionId: "",
            evidenceFrameId: "f2",
          },
          {
            id: "q3",
            type: "sentence_completion",
            prompt: "Fill ____.",
            acceptedAnswers: ["c"],
            options: [],
            correctOptionId: "",
            evidenceFrameId: "f1",
          },
        ],
      }),
    ).toThrow(/at least 3 frames/);
  });
});
