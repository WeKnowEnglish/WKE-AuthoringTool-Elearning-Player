/**
 * Whiteboard review-task adapter over shared activity-runtime review framework.
 * Keeps boardIds / taskKind API for existing whiteboard commands and UI.
 */

import {
  studentFacingState as sharedStudentFacingState,
  type StudentFacingState,
} from "@/lib/activity-runtime/activity-phases";
import {
  createCompareReview,
  createShowReview,
  revealReviewResults,
  reviewResponseCounts as sharedCounts,
  setReviewTaskType,
  submitSharedReviewResponse,
  type ReviewMode,
  type ReviewTaskResponse,
  type ReviewTaskType,
  type SharedReviewState,
} from "@/lib/activity-runtime/review-task-types";

export type { StudentFacingState };

export { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";

/** Whiteboard adapter: accepts legacy `boardStatus` or shared `workStatus`. */
export function studentFacingState(input: {
  phase: string;
  boardStatus?: string | null;
  workStatus?: string | null;
  hasReviewPush: boolean;
}): StudentFacingState {
  return sharedStudentFacingState({
    phase: input.phase,
    workStatus: input.workStatus ?? input.boardStatus,
    hasReviewPush: input.hasReviewPush,
  });
}

export type ReviewTaskKind =
  | "agree"
  | "notice"
  | "suggest_improve"
  | "vote_board"
  | "find_difference"
  | "strongest";

export type ReviewTaskMode = ReviewMode;

export type { ReviewTaskResponse };

export type ReviewTaskState = {
  mode: ReviewTaskMode;
  taskKind: ReviewTaskKind;
  prompt: string;
  boardIds: string[];
  anonymous: boolean;
  responsesByStudentId: Record<string, ReviewTaskResponse>;
  /** Present when created via shared runtime (Chunk 0.5+). */
  reviewId?: string;
  status?: "open" | "results" | "closed";
};

const KIND_TO_TYPE: Record<ReviewTaskKind, ReviewTaskType> = {
  agree: "agree",
  notice: "notice",
  suggest_improve: "suggest_improve",
  vote_board: "vote_board",
  find_difference: "find_difference",
  strongest: "strongest",
};

const TYPE_TO_KIND: Partial<Record<ReviewTaskType, ReviewTaskKind>> = {
  agree: "agree",
  agree_disagree: "agree",
  notice: "notice",
  suggest_improve: "suggest_improve",
  vote: "vote_board",
  vote_board: "vote_board",
  find_difference: "find_difference",
  strongest: "strongest",
  choose_stronger: "strongest",
  short_response: "notice",
};

export const REVIEW_TASK_PRESETS: Record<
  ReviewTaskKind,
  { label: string; defaultPrompt: string; modes: ReviewTaskMode[] }
> = {
  agree: {
    label: "Agree / Disagree",
    defaultPrompt: "Do you agree with this answer? Why?",
    modes: ["show"],
  },
  notice: {
    label: "I notice…",
    defaultPrompt: "Write one thing you notice about this board.",
    modes: ["show", "compare"],
  },
  suggest_improve: {
    label: "Suggest improvement",
    defaultPrompt: "Suggest one improvement.",
    modes: ["show", "compare"],
  },
  vote_board: {
    label: "Vote clearest",
    defaultPrompt: "Which board is clearer?",
    modes: ["compare"],
  },
  find_difference: {
    label: "Find a difference",
    defaultPrompt: "Find one important difference between the boards.",
    modes: ["compare"],
  },
  strongest: {
    label: "Strongest answer",
    defaultPrompt: "Which answer is stronger for this task?",
    modes: ["compare"],
  },
};

export function toSharedReview(state: ReviewTaskState): SharedReviewState {
  return {
    reviewId: state.reviewId ?? "legacy",
    mode: state.mode,
    targetIds: state.boardIds,
    anonymous: state.anonymous,
    task: {
      type: KIND_TO_TYPE[state.taskKind],
      prompt: state.prompt,
      requireResponse: true,
    },
    status: state.status ?? "open",
    responsesByStudentId: state.responsesByStudentId,
    createdAt: Date.now(),
  };
}

export function fromSharedReview(state: SharedReviewState): ReviewTaskState {
  const taskKind =
    TYPE_TO_KIND[state.task.type] ??
    (state.mode === "compare" ? "vote_board" : "notice");
  return {
    mode: state.mode,
    taskKind,
    prompt: state.task.prompt,
    boardIds: state.targetIds,
    anonymous: state.anonymous,
    responsesByStudentId: state.responsesByStudentId,
    reviewId: state.reviewId,
    status: state.status,
  };
}

type RuntimeAccessor = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
};

/** Prefer `runtime.review` (SharedReviewState); fall back to legacy `reviewTask`. */
export function readReviewFromRuntime(runtime: RuntimeAccessor): ReviewTaskState | null {
  const shared = runtime.get("review") as SharedReviewState | null | undefined;
  if (
    shared &&
    typeof shared === "object" &&
    Array.isArray(shared.targetIds) &&
    shared.targetIds.length > 0
  ) {
    return fromSharedReview(shared);
  }
  const legacy = runtime.get("reviewTask") as ReviewTaskState | null | undefined;
  if (legacy && Array.isArray(legacy.boardIds) && legacy.boardIds.length > 0) {
    return legacy;
  }
  return null;
}

/**
 * Dual-write: shared `review` + legacy `reviewTask` + display/compare id fields
 * so older UI paths keep working during migration.
 */
export function syncReviewToRuntime(
  runtime: RuntimeAccessor,
  state: ReviewTaskState | null,
): void {
  if (!state) {
    runtime.set("review", null);
    runtime.set("reviewTask", null);
    runtime.set("displayBoardId", null);
    runtime.set("displayAnonymous", false);
    runtime.set("compareBoardIds", null);
    runtime.set("compareAnonymous", false);
    return;
  }
  runtime.set("review", toSharedReview(state));
  runtime.set("reviewTask", state);
  if (state.mode === "show") {
    runtime.set("displayBoardId", state.boardIds[0] ?? null);
    runtime.set("displayAnonymous", state.anonymous);
    runtime.set("compareBoardIds", null);
    runtime.set("compareAnonymous", false);
  } else {
    const ids = state.boardIds.slice(0, 4);
    runtime.set("compareBoardIds", ids.length >= 2 ? ids : null);
    runtime.set("compareAnonymous", state.anonymous);
    runtime.set("displayBoardId", null);
    runtime.set("displayAnonymous", false);
  }
}

export function revealReviewTaskResults(state: ReviewTaskState): ReviewTaskState {
  return fromSharedReview(revealReviewResults(toSharedReview(state)));
}

export function createEmptyReviewTask(): null {
  return null;
}

export function createShowReviewTask(input: {
  boardId: string;
  anonymous: boolean;
  taskKind?: ReviewTaskKind;
  prompt?: string;
}): ReviewTaskState {
  return fromSharedReview(
    createShowReview({
      targetId: input.boardId,
      anonymous: input.anonymous,
      taskType: input.taskKind ? KIND_TO_TYPE[input.taskKind] : "notice",
      prompt: input.prompt,
    }),
  );
}

export function createCompareReviewTask(input: {
  boardIds: readonly string[];
  anonymous: boolean;
  taskKind?: ReviewTaskKind;
  prompt?: string;
}): ReviewTaskState {
  return fromSharedReview(
    createCompareReview({
      targetIds: input.boardIds,
      anonymous: input.anonymous,
      taskType: input.taskKind ? KIND_TO_TYPE[input.taskKind] : "vote_board",
      prompt: input.prompt,
    }),
  );
}

export function setReviewTaskKind(
  state: ReviewTaskState,
  taskKind: ReviewTaskKind,
  prompt?: string,
): ReviewTaskState {
  return fromSharedReview(
    setReviewTaskType(toSharedReview(state), KIND_TO_TYPE[taskKind], prompt),
  );
}

export function submitReviewResponse(
  state: ReviewTaskState,
  input: {
    studentId: string;
    choice?: string | null;
    note?: string;
    nowMs?: number;
  },
): ReviewTaskState {
  return fromSharedReview(submitSharedReviewResponse(toSharedReview(state), input));
}

export function reviewResponseCounts(state: ReviewTaskState): {
  total: number;
  byChoice: Record<string, number>;
} {
  return sharedCounts(toSharedReview(state));
}
