import { createBlankPictureStoryDocument } from "@/lib/picture-story/blank";
import {
  DEFAULT_PICTURE_STORY_INSTRUCTIONS,
  DEFAULT_PICTURE_STORY_TITLE,
  PICTURE_STORY_KIND,
  PICTURE_STORY_QUESTION_TYPES,
  type PictureStoryDocument,
  type PictureStoryFrame,
  type PictureStoryQuestion,
  type PictureStoryQuestionType,
} from "@/lib/picture-story/types";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asQuestionType(value: unknown): PictureStoryQuestionType {
  if (value === "sentence_completion" || value === "free_response") return value;
  return "multiple_choice";
}

function readFrame(raw: unknown, index: number): PictureStoryFrame | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  return {
    id: asString(row.id, `frame-${index + 1}`),
    imageUrl: asString(row.imageUrl),
    imageAlt: asString(row.imageAlt),
    text: asString(row.text),
  };
}

function readQuestion(
  raw: unknown,
  index: number,
  fallbackFrameId: string,
): PictureStoryQuestion | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const type = asQuestionType(row.type);
  const options = Array.isArray(row.options)
    ? row.options.flatMap((option, optionIndex) => {
        if (!option || typeof option !== "object" || Array.isArray(option)) return [];
        const entry = option as Record<string, unknown>;
        return [
          {
            id: asString(entry.id, `option-${index + 1}-${optionIndex + 1}`),
            text: asString(entry.text),
          },
        ];
      })
    : [];
  if (type === "multiple_choice") {
    while (options.length < 2) {
      options.push({
        id: `option-${index + 1}-${options.length + 1}`,
        text: "",
      });
    }
  }
  const acceptedAnswers = Array.isArray(row.acceptedAnswers)
    ? row.acceptedAnswers.flatMap((answer) =>
        typeof answer === "string" ? [answer] : [],
      )
    : [];
  return {
    id: asString(row.id, `question-${index + 1}`),
    type,
    prompt: asString(row.prompt),
    acceptedAnswers,
    options,
    correctOptionId: asString(row.correctOptionId, options[0]?.id ?? ""),
    evidenceFrameId: asString(row.evidenceFrameId, fallbackFrameId),
  };
}

/** Coerce stored JSON into an editable picture-story draft without requiring assign-ready fields. */
export function asPictureStoryDraft(raw: unknown): PictureStoryDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return createBlankPictureStoryDocument();
  }
  const row = raw as Record<string, unknown>;
  const frames = (Array.isArray(row.frames) ? row.frames : [])
    .map((frame, index) => readFrame(frame, index))
    .filter((frame): frame is PictureStoryFrame => Boolean(frame));
  const nextFrames = frames.length > 0 ? frames : [readFrame({}, 0)!];
  const fallbackFrameId = nextFrames[0]!.id;
  const questions = (Array.isArray(row.questions) ? row.questions : [])
    .map((question, index) => readQuestion(question, index, fallbackFrameId))
    .filter((question): question is PictureStoryQuestion => Boolean(question));
  return {
    version: 1,
    kind: PICTURE_STORY_KIND,
    id: asString(row.id) || "picture-story-draft",
    title: asString(row.title, DEFAULT_PICTURE_STORY_TITLE),
    instructions: asString(row.instructions, DEFAULT_PICTURE_STORY_INSTRUCTIONS),
    frames: nextFrames,
    questions:
      questions.length > 0
        ? questions
        : [readQuestion({}, 0, fallbackFrameId)!],
    allowStoryReviewDuringQuestions: row.allowStoryReviewDuringQuestions !== false,
  };
}

export function clonePictureStoryDocumentForAuthoring(
  source: PictureStoryDocument,
): PictureStoryDocument {
  const frameIds = new Map(
    source.frames.map((frame) => [frame.id, crypto.randomUUID()]),
  );
  const frames = source.frames.map((frame) => ({
    ...frame,
    id: frameIds.get(frame.id) ?? crypto.randomUUID(),
  }));
  const questions = source.questions.map((question) => {
    const optionIds = new Map(
      question.options.map((option) => [option.id, crypto.randomUUID()]),
    );
    const options = question.options.map((option) => ({
      ...option,
      id: optionIds.get(option.id) ?? crypto.randomUUID(),
    }));
    return {
      ...question,
      id: crypto.randomUUID(),
      acceptedAnswers: [...question.acceptedAnswers],
      options,
      correctOptionId:
        optionIds.get(question.correctOptionId) ?? options[0]?.id ?? "",
      evidenceFrameId:
        frameIds.get(question.evidenceFrameId) ?? frames[0]?.id ?? question.evidenceFrameId,
    };
  });
  return {
    ...source,
    id: crypto.randomUUID(),
    frames,
    questions,
  };
}

export function isPictureStoryQuestionType(
  value: string,
): value is PictureStoryQuestionType {
  return (PICTURE_STORY_QUESTION_TYPES as readonly string[]).includes(value);
}
