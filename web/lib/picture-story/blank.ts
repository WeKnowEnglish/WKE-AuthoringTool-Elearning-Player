import {
  DEFAULT_PICTURE_STORY_INSTRUCTIONS,
  DEFAULT_PICTURE_STORY_TITLE,
  PICTURE_STORY_KIND,
  type PictureStoryDocument,
  type PictureStoryFrame,
  type PictureStoryQuestion,
} from "@/lib/picture-story/types";

export function createBlankPictureStoryFrame(): PictureStoryFrame {
  return {
    id: crypto.randomUUID(),
    imageUrl: "",
    imageAlt: "",
    text: "",
  };
}

export function createBlankPictureStoryQuestion(
  evidenceFrameId: string,
  type: PictureStoryQuestion["type"] = "multiple_choice",
): PictureStoryQuestion {
  const optionA = crypto.randomUUID();
  const optionB = crypto.randomUUID();
  if (type === "sentence_completion" || type === "free_response") {
    return {
      id: crypto.randomUUID(),
      type,
      prompt: "",
      acceptedAnswers: [],
      options: [],
      correctOptionId: "",
      evidenceFrameId,
    };
  }
  return {
    id: crypto.randomUUID(),
    type: "multiple_choice",
    prompt: "",
    acceptedAnswers: [],
    options: [
      { id: optionA, text: "" },
      { id: optionB, text: "" },
    ],
    correctOptionId: optionA,
    evidenceFrameId,
  };
}

/** Empty teacher-authored starter: one frame and one multiple-choice question. */
export function createBlankPictureStoryDocument(): PictureStoryDocument {
  const frame = createBlankPictureStoryFrame();
  return {
    version: 1,
    kind: PICTURE_STORY_KIND,
    id: crypto.randomUUID(),
    title: DEFAULT_PICTURE_STORY_TITLE,
    instructions: DEFAULT_PICTURE_STORY_INSTRUCTIONS,
    allowStoryReviewDuringQuestions: true,
    frames: [frame],
    questions: [createBlankPictureStoryQuestion(frame.id)],
  };
}
