import { normalizePictureClozeAnswer } from "@/lib/picture-cloze/scoring";
import type {
  QuestionWritingPlayable,
  QuestionWritingPrompt,
} from "@/lib/question-writing/types";

export type QuestionWritingCheck = {
  capitalLetter: boolean;
  questionMark: boolean;
  minimumWords: boolean;
  requiredWords: boolean;
  questionWord: boolean;
  helpingVerb: boolean;
  wordCount: number;
};

export function checkQuestionWritingResponse(
  response: string,
  prompt: Pick<
    QuestionWritingPrompt,
    "requiredWords" | "questionWord" | "helpingVerbs" | "minWords"
  >,
): QuestionWritingCheck {
  const trimmed = response.trim();
  const words = trimmed.match(/[\p{L}\p{N}']+/gu) ?? [];
  const normalized = words.map((word) => word.toLocaleLowerCase());
  const wordSet = new Set(normalized);
  return {
    capitalLetter: /^[A-Z]/.test(trimmed),
    questionMark: /\?$/.test(trimmed),
    minimumWords: words.length >= prompt.minWords,
    requiredWords: prompt.requiredWords.every((word) =>
      wordSet.has(normalizePictureClozeAnswer(word)),
    ),
    questionWord:
      normalized[0] === normalizePictureClozeAnswer(prompt.questionWord),
    helpingVerb: prompt.helpingVerbs.some((word) =>
      wordSet.has(normalizePictureClozeAnswer(word)),
    ),
    wordCount: words.length,
  };
}

export function isQuestionWritingPromptReady(check: QuestionWritingCheck): boolean {
  return (
    check.capitalLetter &&
    check.questionMark &&
    check.minimumWords &&
    check.requiredWords &&
    check.questionWord &&
    check.helpingVerb
  );
}

export function isQuestionWritingActivityReady(
  activity: Pick<QuestionWritingPlayable, "prompts">,
  responses: Record<string, string>,
): boolean {
  return activity.prompts.every((prompt) =>
    isQuestionWritingPromptReady(
      checkQuestionWritingResponse(responses[prompt.id] ?? "", prompt),
    ),
  );
}
