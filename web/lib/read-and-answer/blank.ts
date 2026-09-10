import {
  DEFAULT_READ_AND_ANSWER_INSTRUCTIONS,
  DEFAULT_READ_AND_ANSWER_TITLE,
  READ_AND_ANSWER_KIND,
  READ_AND_ANSWER_MIN_QUESTIONS,
  type ReadAndAnswerDocument,
  type ReadAndAnswerQuestion,
} from "@/lib/read-and-answer/types";

export function createBlankReadAndAnswerQuestion(): ReadAndAnswerQuestion {
  const optionA = crypto.randomUUID();
  const optionB = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    prompt: "",
    options: [
      { id: optionA, text: "" },
      { id: optionB, text: "" },
    ],
    correctOptionId: optionA,
  };
}

/** Empty teacher-authored starter: passage plus the required number of questions. */
export function createBlankReadAndAnswerDocument(): ReadAndAnswerDocument {
  return {
    version: 1,
    kind: READ_AND_ANSWER_KIND,
    id: crypto.randomUUID(),
    title: DEFAULT_READ_AND_ANSWER_TITLE,
    instructions: DEFAULT_READ_AND_ANSWER_INSTRUCTIONS,
    shuffleOptions: true,
    passage: { text: "" },
    questions: Array.from({ length: READ_AND_ANSWER_MIN_QUESTIONS }, () =>
      createBlankReadAndAnswerQuestion(),
    ),
  };
}
