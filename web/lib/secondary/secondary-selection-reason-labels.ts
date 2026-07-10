import { vocabularyRecommendationReasonLabel } from "@/lib/mastery/recommendations";
import type { VocabularyRecommendationReason } from "@/lib/mastery/recommendations";
import type { SecondarySessionSelectionReason } from "@/lib/secondary/secondary-session-selection";

const VOCAB_REASONS = new Set<VocabularyRecommendationReason>([
  "due_review",
  "fragile",
  "developing",
  "low_confidence",
]);

function isVocabReason(reason: string): reason is VocabularyRecommendationReason {
  return VOCAB_REASONS.has(reason as VocabularyRecommendationReason);
}

/** Student-facing chip label for a selection reason (null = hide). */
export function secondaryStudentReasonLabel(
  reason: SecondarySessionSelectionReason | string | undefined,
): string | null {
  if (!reason) return null;
  switch (reason) {
    case "due_review":
      return "Due";
    case "fragile":
      return "Practice more";
    case "new":
      return "New";
    case "stretch":
      return "Stretch";
    case "refresh":
    case "cloze_include":
      return null;
    default:
      return null;
  }
}

/** Staff/debug label — full reason text for ?secondaryDebug=1. */
export function secondaryDebugReasonLabel(
  reason: SecondarySessionSelectionReason | string | undefined,
): string | null {
  if (!reason) return null;
  if (reason === "new" || reason === "refresh" || reason === "stretch" || reason === "cloze_include") {
    return reason.replaceAll("_", " ");
  }
  if (isVocabReason(reason)) {
    return vocabularyRecommendationReasonLabel(reason);
  }
  return reason.replaceAll("_", " ");
}

export function secondaryStudentReasonChipClass(reason: string): string {
  switch (reason) {
    case "due_review":
      return "text-amber-900";
    case "fragile":
      return "text-orange-900";
    case "new":
      return "text-sky-800";
    case "stretch":
      return "text-violet-800";
    default:
      return "text-kid-ink/80";
  }
}
