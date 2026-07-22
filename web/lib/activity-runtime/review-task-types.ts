/** Shared Show/Compare review-task framework (whiteboard + document). */

export type ReviewMode = "show" | "compare";

export type ReviewTaskType =
  | "notice"
  | "vote"
  | "agree_disagree"
  | "choose_stronger"
  | "short_response"
  | "suggest_improve"
  | "find_difference"
  /** Whiteboard legacy aliases — still accepted. */
  | "agree"
  | "vote_board"
  | "strongest";

export type ReviewLifecycleStatus = "open" | "results" | "closed";

export type ReviewTaskResponse = {
  studentId: string;
  choice: string | null;
  note: string;
  at: number;
};

export type SharedReviewState = {
  reviewId: string;
  mode: ReviewMode;
  /** Board ids, document ids, etc. */
  targetIds: string[];
  anonymous: boolean;
  task: {
    type: ReviewTaskType;
    prompt: string;
    options?: string[];
    requireResponse: boolean;
  };
  status: ReviewLifecycleStatus;
  responsesByStudentId: Record<string, ReviewTaskResponse>;
  createdAt: number;
};

/** Compare pushes at least 2 and at most 4 targets (2×2 layout). */
export const COMPARE_TARGET_MIN = 2;
export const COMPARE_TARGET_MAX = 4;

export const REVIEW_TASK_PRESETS: Record<
  ReviewTaskType,
  { label: string; defaultPrompt: string; modes: ReviewMode[] }
> = {
  notice: {
    label: "I notice…",
    defaultPrompt: "Write one thing you notice.",
    modes: ["show", "compare"],
  },
  vote: {
    label: "Vote",
    defaultPrompt: "Which response is clearer?",
    modes: ["compare"],
  },
  agree_disagree: {
    label: "Agree / Disagree",
    defaultPrompt: "Do you agree with this answer? Why?",
    modes: ["show"],
  },
  choose_stronger: {
    label: "Stronger answer",
    defaultPrompt: "Which answer is stronger for this task?",
    modes: ["compare"],
  },
  short_response: {
    label: "Short response",
    defaultPrompt: "Write a short response.",
    modes: ["show", "compare"],
  },
  suggest_improve: {
    label: "Suggest improvement",
    defaultPrompt: "Suggest one improvement.",
    modes: ["show", "compare"],
  },
  find_difference: {
    label: "Find a difference",
    defaultPrompt: "Find one important difference.",
    modes: ["compare"],
  },
  agree: {
    label: "Agree / Disagree",
    defaultPrompt: "Do you agree with this answer? Why?",
    modes: ["show"],
  },
  vote_board: {
    label: "Vote clearest",
    defaultPrompt: "Which board is clearer?",
    modes: ["compare"],
  },
  strongest: {
    label: "Strongest answer",
    defaultPrompt: "Which answer is stronger for this task?",
    modes: ["compare"],
  },
};

function newReviewId(): string {
  return `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Dedupe and cap compare targets (order preserved). */
export function normalizeCompareTargetIds(ids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= COMPARE_TARGET_MAX) break;
  }
  return out;
}

/** Anonymous labels A, B, C… for compare targets. */
export function compareAnonymousLetterOptions(count: number): string[] {
  const n = Math.max(0, Math.min(count, 26));
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
}

/** Map anonymous letter choice (A–Z) onto targetIds by index. */
export function mapAnonymousLetterChoice(
  choice: string | null | undefined,
  targetIds: readonly string[],
): string | null {
  if (!choice || choice.length !== 1) return null;
  const idx = choice.toUpperCase().charCodeAt(0) - 65;
  if (idx < 0 || idx >= targetIds.length) return null;
  return targetIds[idx] ?? null;
}

export function createShowReview(input: {
  targetId: string;
  anonymous: boolean;
  taskType?: ReviewTaskType;
  prompt?: string;
  nowMs?: number;
}): SharedReviewState {
  const type = input.taskType ?? "notice";
  const preset = REVIEW_TASK_PRESETS[type];
  return {
    reviewId: newReviewId(),
    mode: "show",
    targetIds: [input.targetId],
    anonymous: input.anonymous,
    task: {
      type,
      prompt: input.prompt?.trim() || preset.defaultPrompt,
      requireResponse: true,
    },
    status: "open",
    responsesByStudentId: {},
    createdAt: input.nowMs ?? Date.now(),
  };
}

export function createCompareReview(input: {
  targetIds: readonly string[];
  anonymous: boolean;
  taskType?: ReviewTaskType;
  prompt?: string;
  nowMs?: number;
}): SharedReviewState {
  const targetIds = normalizeCompareTargetIds(input.targetIds);
  if (targetIds.length < COMPARE_TARGET_MIN) {
    throw new Error(`Compare needs at least ${COMPARE_TARGET_MIN} responses.`);
  }
  const type = input.taskType ?? "vote";
  const preset = REVIEW_TASK_PRESETS[type];
  return {
    reviewId: newReviewId(),
    mode: "compare",
    targetIds,
    anonymous: input.anonymous,
    task: {
      type,
      prompt: input.prompt?.trim() || preset.defaultPrompt,
      options: input.anonymous
        ? compareAnonymousLetterOptions(targetIds.length)
        : undefined,
      requireResponse: true,
    },
    status: "open",
    responsesByStudentId: {},
    createdAt: input.nowMs ?? Date.now(),
  };
}

export function setReviewTaskType(
  state: SharedReviewState,
  taskType: ReviewTaskType,
  prompt?: string,
): SharedReviewState {
  const preset = REVIEW_TASK_PRESETS[taskType];
  if (!preset.modes.includes(state.mode)) return state;
  const normalized = normalizeTaskType(taskType);
  const needsLetterOptions =
    state.anonymous &&
    state.mode === "compare" &&
    (normalized === "vote" || normalized === "choose_stronger");
  return {
    ...state,
    task: {
      type: taskType,
      prompt: prompt?.trim() || preset.defaultPrompt,
      options: needsLetterOptions
        ? compareAnonymousLetterOptions(state.targetIds.length)
        : state.task.options,
      requireResponse: true,
    },
    responsesByStudentId: {},
    status: "open",
  };
}

function normalizeTaskType(type: ReviewTaskType): ReviewTaskType {
  if (type === "agree") return "agree_disagree";
  if (type === "vote_board") return "vote";
  if (type === "strongest") return "choose_stronger";
  return type;
}

export function submitSharedReviewResponse(
  state: SharedReviewState,
  input: {
    studentId: string;
    choice?: string | null;
    note?: string;
    nowMs?: number;
  },
): SharedReviewState {
  if (!input.studentId) return state;
  if (state.status === "closed") {
    throw new Error("Review is closed.");
  }

  const taskType = normalizeTaskType(state.task.type);
  const needsChoice =
    taskType === "agree_disagree" ||
    taskType === "vote" ||
    taskType === "choose_stronger";

  let choice = input.choice ?? null;
  if (taskType === "agree_disagree") {
    if (choice !== "agree" && choice !== "disagree") {
      throw new Error("Choose Agree or Disagree.");
    }
  }
  if (taskType === "vote" || taskType === "choose_stronger") {
    if (!choice || !state.targetIds.includes(choice)) {
      const mapped = mapAnonymousLetterChoice(choice, state.targetIds);
      if (mapped) choice = mapped;
      else throw new Error("Choose one of the responses.");
    }
  }
  if (!needsChoice) choice = null;

  const note = (input.note ?? "").trim().slice(0, 280);
  if (
    (taskType === "notice" ||
      taskType === "suggest_improve" ||
      taskType === "find_difference" ||
      taskType === "short_response") &&
    note.length < 2
  ) {
    throw new Error("Write a short response.");
  }

  const response: ReviewTaskResponse = {
    studentId: input.studentId,
    choice,
    note,
    at: input.nowMs ?? Date.now(),
  };

  return {
    ...state,
    responsesByStudentId: {
      ...state.responsesByStudentId,
      [input.studentId]: response,
    },
  };
}

export function revealReviewResults(state: SharedReviewState): SharedReviewState {
  return { ...state, status: "results" };
}

export function closeReview(state: SharedReviewState): SharedReviewState {
  return { ...state, status: "closed" };
}

export function reviewResponseCounts(state: SharedReviewState): {
  total: number;
  byChoice: Record<string, number>;
} {
  const byChoice: Record<string, number> = {};
  const responses = Object.values(state.responsesByStudentId);
  for (const r of responses) {
    const key = r.choice ?? "_note";
    byChoice[key] = (byChoice[key] ?? 0) + 1;
  }
  return { total: responses.length, byChoice };
}
