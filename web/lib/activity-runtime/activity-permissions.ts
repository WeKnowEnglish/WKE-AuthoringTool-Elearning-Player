/**
 * Shared edit/submit permission helpers.
 * Re-exports collaborative-activity board permissions for whiteboard compatibility
 * and adds document-oriented helpers that do not depend on whiteboard types.
 */

export {
  canEditBoard,
  canSubmitBoard,
  userCanEditBoard,
  type EditPermissionInput,
} from "@/lib/collaborative-activity/permissions";

import type { ActivityRuntimePhase, ActivityWorkStatus } from "@/lib/activity-runtime/activity-types";

export function canEditActivityWork(input: {
  phase: ActivityRuntimePhase | string;
  workStatus: ActivityWorkStatus | string | null;
  role: "host" | "player";
  isOwner: boolean;
  hasReviewPush: boolean;
}): boolean {
  if (input.hasReviewPush) return false;
  if (input.role === "host") return false; // host inspects; students edit
  if (!input.isOwner) return false;
  const phase = String(input.phase).toLowerCase();
  const status = String(input.workStatus ?? "").toLowerCase();
  if (phase === "completed" || phase === "ended") return false;
  // After Collect, wait for Revise before editing returned work.
  if (phase === "collected" || phase === "review") return false;
  if (status === "submitted" || status === "auto_submitted" || status === "locked") {
    return false;
  }
  if (phase === "revision") {
    return status === "returned" || status === "revising" || status === "active";
  }
  if (status === "returned" || status === "revising") return true;
  if (phase === "active" || phase === "open" || phase === "paused") {
    return status === "active" || status === "waiting" || !status;
  }
  return false;
}

export function canSubmitActivityWork(input: {
  phase: ActivityRuntimePhase | string;
  workStatus: ActivityWorkStatus | string | null;
  isOwner: boolean;
}): boolean {
  if (!input.isOwner) return false;
  const phase = String(input.phase).toLowerCase();
  const status = String(input.workStatus ?? "").toLowerCase();
  if (!(phase === "active" || phase === "open" || phase === "paused" || phase === "revision")) {
    return false;
  }
  if (status === "submitted" || status === "auto_submitted" || status === "locked") {
    return false;
  }
  if (phase === "revision") {
    return status === "returned" || status === "revising" || status === "active";
  }
  return status === "active" || status === "waiting" || status === "returned" || status === "revising" || !status;
}
