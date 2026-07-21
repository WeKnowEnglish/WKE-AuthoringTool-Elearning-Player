import type {
  ActivityRuntimePhase,
  ActivityWorkStatus,
  LegacyActivityPhase,
} from "@/lib/activity-runtime/activity-types";

/** Student-facing labels (Interaction Style Guide). */
export type StudentFacingState =
  | "Waiting"
  | "Active"
  | "Submitted"
  | "Class review"
  | "Revision"
  | "Completed";

export function toRuntimePhase(phase: LegacyActivityPhase | string): ActivityRuntimePhase {
  switch (phase) {
    case "DRAFT":
    case "WAITING":
    case "waiting":
      return "waiting";
    case "OPEN":
    case "PAUSED":
    case "COLLECTING":
    case "active":
      return "active";
    case "COLLECTED":
    case "collected":
      return "collected";
    case "REVIEW":
    case "review":
      return "review";
    case "REVISION":
    case "revision":
      return "revision";
    case "moderating":
      return "moderating";
    case "play":
      return "play";
    case "ENDED":
    case "completed":
      return "completed";
    default:
      return "waiting";
  }
}

export function fromRuntimePhaseToWhiteboard(
  phase: ActivityRuntimePhase,
): LegacyActivityPhase {
  switch (phase) {
    case "waiting":
      return "WAITING";
    case "active":
      return "OPEN";
    case "collected":
      return "COLLECTED";
    case "review":
      return "REVIEW";
    case "revision":
      return "REVISION";
    case "moderating":
      return "COLLECTED";
    case "play":
      return "OPEN";
    case "completed":
      return "ENDED";
    default:
      return "WAITING";
  }
}

export function studentFacingState(input: {
  phase: string;
  workStatus?: string | null;
  hasReviewPush: boolean;
}): StudentFacingState {
  const runtime = toRuntimePhase(input.phase);
  const status = (input.workStatus ?? "").toLowerCase();

  if (runtime === "completed" || input.phase === "ENDED") return "Completed";
  // Definition race: Active while choosing; Submitted once locked/revealed (or local lock).
  if (runtime === "play") {
    if (
      status === "submitted" ||
      status === "auto_submitted" ||
      status === "locked" ||
      status === "auto-submitted"
    ) {
      return "Submitted";
    }
    return "Active";
  }
  if (
    input.hasReviewPush ||
    runtime === "review" ||
    runtime === "collected" ||
    runtime === "moderating" ||
    input.phase === "REVIEW" ||
    input.phase === "COLLECTED"
  ) {
    return "Class review";
  }
  if (status === "returned" || status === "revising") {
    return "Revision";
  }
  if (
    status === "submitted" ||
    status === "auto_submitted" ||
    status === "locked" ||
    status === "auto-submitted"
  ) {
    return "Submitted";
  }
  if (runtime === "revision" || input.phase === "REVISION") {
    return "Revision";
  }
  if (runtime === "waiting" || input.phase === "DRAFT" || input.phase === "WAITING") {
    return "Waiting";
  }
  if (
    runtime === "active" ||
    input.phase === "OPEN" ||
    input.phase === "PAUSED" ||
    input.phase === "COLLECTING"
  ) {
    return "Active";
  }
  return "Waiting";
}

export function normalizeWorkStatus(status: string | null | undefined): ActivityWorkStatus | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "auto_submitted" || s === "auto-submitted") return "auto_submitted";
  if (
    s === "waiting" ||
    s === "active" ||
    s === "submitted" ||
    s === "returned" ||
    s === "revising" ||
    s === "completed" ||
    s === "locked" ||
    s === "reviewed"
  ) {
    return s as ActivityWorkStatus;
  }
  // Whiteboard legacy UPPER
  const map: Record<string, ActivityWorkStatus> = {
    WAITING: "waiting",
    ACTIVE: "active",
    SUBMITTED: "submitted",
    AUTO_SUBMITTED: "auto_submitted",
    RETURNED: "returned",
    LOCKED: "locked",
    REVIEWED: "reviewed",
  };
  return map[status] ?? null;
}
