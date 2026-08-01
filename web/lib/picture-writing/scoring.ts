import { normalizePictureClozeAnswer } from "@/lib/picture-cloze/scoring";
import type {
  PictureWritingPlayable,
  PictureWritingPrompt,
} from "@/lib/picture-writing/types";

export type PictureWritingCheck = {
  capitalLetter: boolean;
  endingPunctuation: boolean;
  minimumWords: boolean;
  requiredWords: boolean;
  wordCount: number;
};

export function checkPictureWritingResponse(
  response: string,
  prompt: Pick<PictureWritingPrompt, "requiredWords" | "minWords">,
): PictureWritingCheck {
  const trimmed = response.trim();
  const words = trimmed.match(/[\p{L}\p{N}']+/gu) ?? [];
  const normalizedWords = new Set(
    words.map((word) => word.toLocaleLowerCase()),
  );
  return {
    capitalLetter: /^[A-Z]/.test(trimmed),
    endingPunctuation: /[.!?]$/.test(trimmed),
    minimumWords: words.length >= prompt.minWords,
    requiredWords: prompt.requiredWords.every((word) =>
      normalizedWords.has(normalizePictureClozeAnswer(word)),
    ),
    wordCount: words.length,
  };
}

export function isPictureWritingPromptReady(check: PictureWritingCheck): boolean {
  return (
    check.capitalLetter &&
    check.endingPunctuation &&
    check.minimumWords &&
    check.requiredWords
  );
}

export function isPictureWritingActivityReady(
  activity: Pick<PictureWritingPlayable, "prompts">,
  responses: Record<string, string>,
): boolean {
  return activity.prompts.every((prompt) =>
    isPictureWritingPromptReady(
      checkPictureWritingResponse(responses[prompt.id] ?? "", prompt),
    ),
  );
}
