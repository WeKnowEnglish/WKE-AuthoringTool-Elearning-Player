import type {
  PictureStoryDocument,
  PictureStoryFrame,
  PictureStoryOption,
  PictureStoryPlayable,
  PictureStoryQuestion,
  PictureStoryQuestionType,
} from "@/lib/picture-story/types";
import {
  DEFAULT_PICTURE_STORY_INSTRUCTIONS,
  PICTURE_STORY_KIND,
  PICTURE_STORY_QUESTION_TYPES,
} from "@/lib/picture-story/types";

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function parseFrame(raw: unknown, index: number): PictureStoryFrame {
  const frame = assertRecord(raw, `frames[${index}]`);
  return {
    id: assertString(frame.id, `frames[${index}].id`),
    imageUrl: assertString(frame.imageUrl, `frames[${index}].imageUrl`),
    imageAlt: assertString(frame.imageAlt, `frames[${index}].imageAlt`),
    text: assertString(frame.text, `frames[${index}].text`),
  };
}

function parseOption(
  raw: unknown,
  questionIndex: number,
  optionIndex: number,
): PictureStoryOption {
  const option = assertRecord(raw, `questions[${questionIndex}].options[${optionIndex}]`);
  return {
    id: assertString(option.id, `questions[${questionIndex}].options[${optionIndex}].id`),
    text: assertString(option.text, `questions[${questionIndex}].options[${optionIndex}].text`),
  };
}

function parseQuestionType(value: unknown, index: number): PictureStoryQuestionType {
  if (
    typeof value === "string" &&
    (PICTURE_STORY_QUESTION_TYPES as readonly string[]).includes(value)
  ) {
    return value as PictureStoryQuestionType;
  }
  throw new Error(
    `questions[${index}].type must be "sentence_completion" or "multiple_choice".`,
  );
}

function parseQuestion(
  raw: unknown,
  index: number,
  frameIds: Set<string>,
): PictureStoryQuestion {
  const question = assertRecord(raw, `questions[${index}]`);
  const type = parseQuestionType(question.type, index);
  const evidenceFrameId = assertString(
    question.evidenceFrameId,
    `questions[${index}].evidenceFrameId`,
  );
  if (!frameIds.has(evidenceFrameId)) {
    throw new Error(`questions[${index}].evidenceFrameId must match a frame id.`);
  }

  const acceptedAnswers = Array.isArray(question.acceptedAnswers)
    ? question.acceptedAnswers.map((answer, answerIndex) =>
        assertString(answer, `questions[${index}].acceptedAnswers[${answerIndex}]`),
      )
    : [];
  if (acceptedAnswers.length > 5) {
    throw new Error(`questions[${index}].acceptedAnswers supports at most 5 answers.`);
  }

  const options = Array.isArray(question.options)
    ? question.options.map((option, optionIndex) => parseOption(option, index, optionIndex))
    : [];
  if (options.length > 4) {
    throw new Error(`questions[${index}].options supports at most 4 choices.`);
  }

  const correctOptionId =
    typeof question.correctOptionId === "string" ? question.correctOptionId.trim() : "";

  if (type === "sentence_completion") {
    if (acceptedAnswers.length < 1) {
      throw new Error(`questions[${index}] needs acceptedAnswers for sentence_completion.`);
    }
  }

  if (type === "multiple_choice") {
    if (options.length < 2) {
      throw new Error(`questions[${index}].options needs at least 2 choices.`);
    }
    if (!correctOptionId || !options.some((option) => option.id === correctOptionId)) {
      throw new Error(`questions[${index}].correctOptionId must be one of the options.`);
    }
  }

  return {
    id: assertString(question.id, `questions[${index}].id`),
    type,
    prompt: assertString(question.prompt, `questions[${index}].prompt`),
    acceptedAnswers,
    options,
    correctOptionId,
    evidenceFrameId,
  };
}

/** Validate a picture-story authoring document (3–6 frames, 3–6 questions). */
export function validatePictureStoryDocument(raw: unknown): PictureStoryDocument {
  const doc = assertRecord(raw, "picture story document");
  if (doc.version !== 1) {
    throw new Error("picture story document.version must be 1.");
  }
  if (doc.kind !== PICTURE_STORY_KIND) {
    throw new Error(`picture story document.kind must be "${PICTURE_STORY_KIND}".`);
  }
  if (!Array.isArray(doc.frames) || doc.frames.length < 3) {
    throw new Error("Need at least 3 frames.");
  }
  if (doc.frames.length > 6) {
    throw new Error("Supports at most 6 frames.");
  }
  if (!Array.isArray(doc.questions) || doc.questions.length < 3) {
    throw new Error("Need at least 3 questions.");
  }
  if (doc.questions.length > 6) {
    throw new Error("Supports at most 6 questions.");
  }

  const frames = doc.frames.map((frame, index) => parseFrame(frame, index));
  const frameIds = new Set(frames.map((frame) => frame.id));
  if (frameIds.size !== frames.length) {
    throw new Error("frames must have unique ids.");
  }

  const questions = doc.questions.map((question, index) =>
    parseQuestion(question, index, frameIds),
  );

  return {
    version: 1,
    kind: PICTURE_STORY_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_PICTURE_STORY_INSTRUCTIONS,
    frames,
    questions,
    allowStoryReviewDuringQuestions: doc.allowStoryReviewDuringQuestions !== false,
  };
}

export function toPictureStoryPlayable(
  document: PictureStoryDocument,
): PictureStoryPlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    frames: document.frames.map((frame) => ({ ...frame })),
    questions: document.questions.map((question) => ({
      ...question,
      acceptedAnswers: [...question.acceptedAnswers],
      options: question.options.map((option) => ({ ...option })),
    })),
    allowStoryReviewDuringQuestions: document.allowStoryReviewDuringQuestions,
  };
}

export function pictureStoryStubPack(
  document: PictureStoryDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "picture-story-pack",
    id: document.id,
    title: document.title,
    question_count: document.questions.length,
    frame_count: document.frames.length,
    document,
  };
}

export function resolvePictureStoryFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): PictureStoryDocument {
  if (input.authoring) {
    try {
      return validatePictureStoryDocument(input.authoring);
    } catch {
      /* Fall through. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "picture story pack");
  if (pack.document) {
    return validatePictureStoryDocument(pack.document);
  }
  return validatePictureStoryDocument(pack);
}
