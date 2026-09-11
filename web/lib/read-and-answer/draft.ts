import { createBlankReadAndAnswerDocument } from "@/lib/read-and-answer/blank";
import {
  DEFAULT_READ_AND_ANSWER_INSTRUCTIONS,
  DEFAULT_READ_AND_ANSWER_TITLE,
  READ_AND_ANSWER_KIND,
  type ReadAndAnswerDocument,
  type ReadAndAnswerPassage,
  type ReadAndAnswerQuestion,
} from "@/lib/read-and-answer/types";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readQuestion(raw: unknown, index: number): ReadAndAnswerQuestion | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
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
  const nextOptions = [...options];
  while (nextOptions.length < 2) {
    nextOptions.push({
      id: `option-${index + 1}-${nextOptions.length + 1}`,
      text: "",
    });
  }
  return {
    id: asString(row.id, `question-${index + 1}`),
    prompt: asString(row.prompt),
    options: nextOptions,
    correctOptionId: asString(row.correctOptionId, nextOptions[0]!.id),
  };
}

function readPassage(raw: unknown): ReadAndAnswerPassage {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { text: "" };
  }
  const row = raw as Record<string, unknown>;
  const title = asString(row.title);
  const imageUrl = asString(row.imageUrl);
  const imageAlt = asString(row.imageAlt);
  return {
    text: asString(row.text),
    ...(title ? { title } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageAlt ? { imageAlt } : {}),
  };
}

/** Coerce stored JSON into an editable read-and-answer draft without requiring assign-ready fields. */
export function asReadAndAnswerDraft(raw: unknown): ReadAndAnswerDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return createBlankReadAndAnswerDocument();
  }
  const row = raw as Record<string, unknown>;
  const questions = (Array.isArray(row.questions) ? row.questions : [])
    .map((question, index) => readQuestion(question, index))
    .filter((question): question is ReadAndAnswerQuestion => Boolean(question));
  const fallbackQuestions = [
    readQuestion({}, 0)!,
    readQuestion({}, 1)!,
    readQuestion({}, 2)!,
  ];
  return {
    version: 1,
    kind: READ_AND_ANSWER_KIND,
    id: asString(row.id) || "read-and-answer-draft",
    title: asString(row.title, DEFAULT_READ_AND_ANSWER_TITLE),
    instructions: asString(row.instructions, DEFAULT_READ_AND_ANSWER_INSTRUCTIONS),
    passage: readPassage(row.passage),
    questions: questions.length > 0 ? questions : fallbackQuestions,
    shuffleOptions: row.shuffleOptions !== false,
  };
}

export function cloneReadAndAnswerDocumentForAuthoring(
  source: ReadAndAnswerDocument,
): ReadAndAnswerDocument {
  return {
    ...source,
    id: crypto.randomUUID(),
    passage: { ...source.passage },
    questions: source.questions.map((question) => {
      const options = question.options.map((option) => ({
        ...option,
        id: crypto.randomUUID(),
      }));
      return {
        ...question,
        id: crypto.randomUUID(),
        options,
        correctOptionId:
          options[
            Math.max(
              0,
              question.options.findIndex((option) => option.id === question.correctOptionId),
            )
          ]?.id ??
          options[0]?.id ??
          "",
      };
    }),
  };
}
