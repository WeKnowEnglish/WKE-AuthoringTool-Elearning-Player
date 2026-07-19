/** Document review helpers over shared activity-runtime review framework. */

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

export type DocumentReviewTaskType = Extract<
  ReviewTaskType,
  "notice" | "vote" | "agree_disagree" | "choose_stronger" | "short_response" | "suggest_improve" | "find_difference"
>;

export type DocumentReviewState = SharedReviewState;

export const DOCUMENT_SHOW_TASKS: DocumentReviewTaskType[] = [
  "notice",
  "agree_disagree",
  "short_response",
  "suggest_improve",
];

export const DOCUMENT_COMPARE_TASKS: DocumentReviewTaskType[] = [
  "vote",
  "choose_stronger",
  "find_difference",
  "notice",
  "short_response",
];

export function createDocumentShowReview(input: {
  documentId: string;
  anonymous: boolean;
  taskType?: DocumentReviewTaskType;
  prompt?: string;
}): DocumentReviewState {
  return createShowReview({
    targetId: input.documentId,
    anonymous: input.anonymous,
    taskType: input.taskType ?? "notice",
    prompt: input.prompt,
  });
}

export function createDocumentCompareReview(input: {
  documentIds: [string, string];
  anonymous: boolean;
  taskType?: DocumentReviewTaskType;
  prompt?: string;
}): DocumentReviewState {
  return createCompareReview({
    targetIds: input.documentIds,
    anonymous: input.anonymous,
    taskType: input.taskType ?? "choose_stronger",
    prompt: input.prompt,
  });
}

/**
 * Label for Show/Compare cards.
 * Prefer Storage displayName (group name / student name) when not anonymous.
 */
export function documentReviewLabel(
  review: DocumentReviewState,
  documentId: string,
  index: number,
  displayName?: string | null,
): string {
  if (review.anonymous) {
    return review.mode === "compare"
      ? `Response ${String.fromCharCode(65 + index)}`
      : "Response";
  }
  const named = displayName?.trim();
  if (named) return named;
  if (documentId.startsWith("document:group:")) {
    return `Group ${documentId.slice("document:group:".length)}`;
  }
  if (documentId.startsWith("document:student:")) {
    return `Student ${documentId.slice("document:student:".length)}`;
  }
  return `Doc ${index + 1}`;
}

/** True when a stored document is eligible for Show/Compare push. */
export function canPushDocumentForReview(input: {
  status: string | null | undefined;
  ownerType: string | null | undefined;
  ownerId: string | null | undefined;
  /** Active group ids from Storage `groups` (orphans omitted). */
  activeGroupIds?: string[];
}): boolean {
  const status = (input.status ?? "").toLowerCase();
  const reviewable =
    status === "submitted" ||
    status === "auto_submitted" ||
    status === "locked" ||
    status === "returned";
  if (!reviewable) return false;
  if (input.ownerType === "group") {
    const ownerId = input.ownerId ?? "";
    const active = input.activeGroupIds ?? [];
    if (active.length > 0 && !active.includes(ownerId)) return false;
  }
  return true;
}

export {
  closeReview,
  revealReviewResults,
  reviewResponseCounts,
  setReviewTaskType,
  submitSharedReviewResponse,
  REVIEW_TASK_PRESETS,
};
