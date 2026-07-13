import "server-only";

import { parseQuestionPayload } from "@/lib/live-game/question-banks/schemas";
import type {
  LiveGameQuestionBank,
  LiveGameQuestionRow,
  LiveGameQuestionSetRow,
} from "@/lib/live-game/question-banks/types";

export type PublishValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; error: string; bank?: LiveGameQuestionBank; questionId?: string };

const BANKS: LiveGameQuestionBank[] = ["harvest", "deposit", "craft"];

export function validateSetForPublish(
  set: LiveGameQuestionSetRow,
  questions: LiveGameQuestionRow[],
): PublishValidationResult {
  if (!set.title.trim()) {
    return { ok: false, error: "Title is required before publishing." };
  }

  for (const bank of BANKS) {
    const enabled = questions.filter((q) => q.bank === bank && q.enabled);
    if (enabled.length === 0) {
      return {
        ok: false,
        error: `Add at least one enabled ${bank} question before publishing.`,
        bank,
      };
    }
    for (const question of enabled) {
      try {
        parseQuestionPayload(question.payload);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Invalid question payload.",
          bank,
          questionId: question.id,
        };
      }
    }
  }

  const warnings: string[] = [];
  const harvestEnabled = questions.filter((q) => q.bank === "harvest" && q.enabled).length;
  if (harvestEnabled < 10) {
    warnings.push("This set has fewer than 10 harvest questions. Long sessions may repeat prompts.");
  }

  return { ok: true, warnings };
}
