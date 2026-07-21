/** Word cards review helpers over shared activity-runtime review framework. */

import {
  closeReview,
  createCompareReview,
  createShowReview,
  revealReviewResults,
  reviewResponseCounts,
  setReviewTaskType,
  submitSharedReviewResponse,
  REVIEW_TASK_PRESETS,
  type ReviewTaskType,
  type SharedReviewState,
} from "@/lib/activity-runtime/review-task-types";

export type WordCardsReviewTaskType = Extract<
  ReviewTaskType,
  | "notice"
  | "vote"
  | "agree_disagree"
  | "choose_stronger"
  | "short_response"
  | "suggest_improve"
  | "find_difference"
>;

export type WordCardsReviewState = SharedReviewState;

export const WORD_CARDS_SHOW_TASKS: WordCardsReviewTaskType[] = [
  "notice",
  "agree_disagree",
  "short_response",
  "suggest_improve",
];

export const WORD_CARDS_COMPARE_TASKS: WordCardsReviewTaskType[] = [
  "vote",
  "choose_stronger",
  "find_difference",
  "notice",
  "short_response",
];

export function createWordCardsShowReview(input: {
  cardId: string;
  anonymous: boolean;
  taskType?: WordCardsReviewTaskType;
  prompt?: string;
}): WordCardsReviewState {
  return createShowReview({
    targetId: input.cardId,
    anonymous: input.anonymous,
    taskType: input.taskType ?? "notice",
    prompt: input.prompt,
  });
}

export function createWordCardsCompareReview(input: {
  cardIds: [string, string];
  anonymous: boolean;
  taskType?: WordCardsReviewTaskType;
  prompt?: string;
}): WordCardsReviewState {
  return createCompareReview({
    targetIds: input.cardIds,
    anonymous: input.anonymous,
    taskType: input.taskType ?? "choose_stronger",
    prompt: input.prompt,
  });
}

export function wordCardsReviewLabel(
  review: WordCardsReviewState,
  cardId: string,
  index: number,
  displayName?: string | null,
): string {
  if (review.anonymous) {
    return review.mode === "compare"
      ? `Card ${String.fromCharCode(65 + index)}`
      : "Card";
  }
  const named = displayName?.trim();
  if (named) return named;
  if (cardId.startsWith("card:group:")) {
    return `Group ${cardId.slice("card:group:".length)}`;
  }
  if (cardId.startsWith("card:student:")) {
    return `Student ${cardId.slice("card:student:".length)}`;
  }
  return `Card ${index + 1}`;
}

/** True when a stored card is eligible for Show/Compare push. */
export function canPushCardForReview(input: {
  status: string | null | undefined;
  ownerType: string | null | undefined;
  ownerId?: string | null | undefined;
  /** Active group ids from Storage `groups` (orphans omitted). */
  activeGroupIds?: string[];
}): boolean {
  if (input.ownerType === "teacher") return false;
  if (input.ownerType === "group") {
    const ownerId = input.ownerId ?? "";
    const active = input.activeGroupIds ?? [];
    if (active.length > 0 && !active.includes(ownerId)) return false;
  }
  const status = (input.status ?? "").toLowerCase();
  return (
    status === "submitted" ||
    status === "auto_submitted" ||
    status === "locked" ||
    status === "returned"
  );
}

export {
  closeReview,
  revealReviewResults,
  reviewResponseCounts,
  setReviewTaskType,
  submitSharedReviewResponse,
  REVIEW_TASK_PRESETS,
};
