/** Shared classroom collaborative activity contract (P3). */

export type CollaborativeActivityKind =
  | "whiteboard"
  | "sentence_strip"
  | "shared_table"
  | "role_cards"
  | "quiz_race";

export type ActivityRoundPhase =
  | "DRAFT"
  | "WAITING"
  | "OPEN"
  | "PAUSED"
  | "COLLECTING"
  | "COLLECTED"
  | "REVIEW"
  | "REVISION"
  | "ENDED";

export type ActivityBoardStatus =
  | "WAITING"
  | "ACTIVE"
  | "SUBMITTED"
  | "AUTO_SUBMITTED"
  | "RETURNED"
  | "LOCKED"
  | "REVIEWED";

export type ActivityOwnerType = "teacher" | "student" | "group";

export type ActivityAuthRole = "host" | "player";

export type ActivityBoardScope =
  | { type: "teacher" }
  | { type: "student"; studentId: string }
  | { type: "group"; groupId: string };

export type ActivityGroupSubmitPolicy =
  | "any_member"
  | "leader_only"
  | "everyone_ready";

export type ActivityTimerStatus = "idle" | "running" | "paused" | "expired";

export type ActivityTimerState = {
  status: ActivityTimerStatus;
  durationMs: number;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedPausedMs: number;
};

export type ActivityKindMeta = {
  kind: CollaborativeActivityKind;
  label: string;
  description: string;
};

export const ACTIVITY_KIND_META: Record<CollaborativeActivityKind, ActivityKindMeta> = {
  whiteboard: {
    kind: "whiteboard",
    label: "Whiteboard",
    description: "Bounded drawing and text boards",
  },
  sentence_strip: {
    kind: "sentence_strip",
    label: "Sentence strip",
    description: "Arrange word tiles into a sentence",
  },
  shared_table: {
    kind: "shared_table",
    label: "Shared table",
    description: "Fill cells in a fixed grid",
  },
  role_cards: {
    kind: "role_cards",
    label: "Role cards",
    description: "Assigned speaking roles",
  },
  quiz_race: {
    kind: "quiz_race",
    label: "Quiz race",
    description: "Timed quiz collaboration",
  },
};

export function submissionIdempotencyKey(
  roundId: string,
  boardId: string,
  revision: number,
): string {
  return `${roundId}:${boardId}:${revision}`;
}

export function boardIdForScope(scope: ActivityBoardScope): string {
  if (scope.type === "teacher") return "board:teacher";
  if (scope.type === "student") return `board:student:${scope.studentId}`;
  return `board:group:${scope.groupId}`;
}

export function createIdleTimer(durationMs: number): ActivityTimerState {
  return {
    status: "idle",
    durationMs,
    startedAt: null,
    pausedAt: null,
    accumulatedPausedMs: 0,
  };
}
