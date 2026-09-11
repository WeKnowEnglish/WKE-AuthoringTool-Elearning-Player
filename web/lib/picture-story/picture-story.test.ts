import { describe, expect, it } from "vitest";
import {
  asPictureStoryDraft,
  clonePictureStoryDocumentForAuthoring,
  createBlankPictureStoryDocument,
  createSamplePictureStoryDocument,
  isPictureStoryMastered,
  pictureStoryStubPack,
  scorePictureStoryAnswers,
  validatePictureStoryDocument,
} from "@/lib/picture-story";

function oneFrameStory() {
  return validatePictureStoryDocument({
    version: 1,
    kind: "picture-story",
    id: "one-frame",
    title: "The cat",
    instructions: "Look at the picture. Then answer.",
    allowStoryReviewDuringQuestions: true,
    frames: [
      {
        id: "f1",
        imageUrl: "https://example.com/cat.jpg",
        imageAlt: "A cat sits on a mat.",
        text: "The cat sits on the mat.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        prompt: "Where is the cat?",
        acceptedAnswers: [],
        options: [
          { id: "a", text: "On the mat" },
          { id: "b", text: "In a tree" },
        ],
        correctOptionId: "a",
        evidenceFrameId: "f1",
      },
    ],
  });
}

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

  it("accepts a single frame and question", () => {
    const doc = oneFrameStory();
    expect(doc.frames).toHaveLength(1);
    expect(doc.questions).toHaveLength(1);
    expect(
      isPictureStoryMastered(scorePictureStoryAnswers(doc.questions, { q1: "a" })),
    ).toBe(true);
  });

  it("does not treat a blank starter as assignable", () => {
    const blank = createBlankPictureStoryDocument();
    expect(blank.frames).toHaveLength(1);
    expect(blank.questions).toHaveLength(1);
    expect(blank.title).not.toBe("Mia's Little Seed");
    expect(() => validatePictureStoryDocument(blank)).toThrow();
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

  it("rejects a story with no frames", () => {
    expect(() =>
      validatePictureStoryDocument({
        version: 1,
        kind: "picture-story",
        id: "empty",
        title: "Empty",
        instructions: "Read.",
        allowStoryReviewDuringQuestions: true,
        frames: [],
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
        ],
      }),
    ).toThrow(/at least 1 frame/);
  });

  it("keeps incomplete drafts editable and remaps sample ids on clone", () => {
    const fromEmpty = asPictureStoryDraft({});
    expect(fromEmpty.frames).toHaveLength(1);
    expect(fromEmpty.questions).toHaveLength(1);
    expect(asPictureStoryDraft({}).frames[0]!.id).toBe(fromEmpty.frames[0]!.id);

    const sample = createSamplePictureStoryDocument();
    const draft = asPictureStoryDraft(sample);
    expect(draft.frames).toHaveLength(3);
    expect(draft.questions[1]?.type).toBe("multiple_choice");

    const clone = clonePictureStoryDocumentForAuthoring(sample);
    expect(clone.id).not.toBe(sample.id);
    expect(clone.frames[0]!.id).not.toBe(sample.frames[0]!.id);
    expect(clone.questions[0]!.evidenceFrameId).toBe(clone.frames[0]!.id);
    expect(validatePictureStoryDocument(clone).title).toBe(sample.title);
  });

  it("accepts a free-response question without an answer key", () => {
    const doc = validatePictureStoryDocument({
      version: 1,
      kind: "picture-story",
      id: "write-about-cat",
      title: "The cat",
      instructions: "Look at the picture. Then write.",
      allowStoryReviewDuringQuestions: true,
      frames: [
        {
          id: "f1",
          imageUrl: "https://example.com/cat.jpg",
          imageAlt: "A cat sits on a mat.",
          text: "The cat sits on the mat.",
        },
      ],
      questions: [
        {
          id: "q1",
          type: "free_response",
          prompt: "What is the cat doing?",
          acceptedAnswers: [],
          options: [],
          correctOptionId: "",
          evidenceFrameId: "f1",
        },
      ],
    });
    expect(doc.questions[0]?.type).toBe("free_response");
    expect(
      isPictureStoryMastered(scorePictureStoryAnswers(doc.questions, { q1: "" })),
    ).toBe(false);
    expect(
      isPictureStoryMastered(
        scorePictureStoryAnswers(doc.questions, { q1: "The cat is sitting." }),
      ),
    ).toBe(true);
    expect(asPictureStoryDraft(doc).questions[0]?.type).toBe("free_response");
  });
});
