import type {
  ActivityAuthRole,
  ActivityBoardStatus,
  ActivityOwnerType,
  ActivityRoundPhase,
  ActivityTimerState,
} from "@/lib/collaborative-activity/domain";
import { remainingMs } from "@/lib/collaborative-activity/timer";

export type EditPermissionInput = {
  phase: ActivityRoundPhase;
  boardStatus: ActivityBoardStatus;
  timer: ActivityTimerState;
  nowMs: number;
  userId: string;
  role: ActivityAuthRole;
  boardOwnerType: ActivityOwnerType;
  boardOwnerId: string;
  boardMemberIds?: string[];
};

export function userCanEditBoard(input: {
  userId: string;
  role: ActivityAuthRole;
  boardOwnerType: ActivityOwnerType;
  boardOwnerId: string;
  boardMemberIds?: string[];
}): boolean {
  if (input.role === "host" && input.boardOwnerType === "teacher") {
    return input.boardOwnerId === input.userId || input.boardOwnerId === "teacher";
  }
  if (input.boardOwnerType === "student") {
    return input.boardOwnerId === input.userId;
  }
  if (input.boardOwnerType === "group") {
    return (input.boardMemberIds ?? []).includes(input.userId);
  }
  return false;
}

export function canEditBoard(input: EditPermissionInput): boolean {
  if (input.phase !== "OPEN" && input.phase !== "REVISION") return false;
  if (
    input.boardStatus === "SUBMITTED" ||
    input.boardStatus === "AUTO_SUBMITTED" ||
    input.boardStatus === "LOCKED" ||
    input.boardStatus === "REVIEWED"
  ) {
    return false;
  }
  // Revision ignores the activity timer so returned work stays editable.
  if (
    input.phase !== "REVISION" &&
    remainingMs(input.timer, input.nowMs) <= 0 &&
    input.timer.status !== "idle"
  ) {
    return false;
  }
  return userCanEditBoard(input);
}

export function canSubmitBoard(input: {
  phase: ActivityRoundPhase;
  boardStatus: ActivityBoardStatus;
  allowEarlySubmit: boolean;
  userCanEdit: boolean;
}): boolean {
  if (input.phase !== "OPEN" && input.phase !== "REVISION") return false;
  if (!input.allowEarlySubmit) return false;
  if (
    input.boardStatus === "SUBMITTED" ||
    input.boardStatus === "AUTO_SUBMITTED" ||
    input.boardStatus === "LOCKED"
  ) {
    return false;
  }
  return input.userCanEdit || input.boardStatus === "RETURNED" || input.boardStatus === "ACTIVE";
}
