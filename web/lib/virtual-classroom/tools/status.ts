/** Session-scoped classroom status (Ready / Help / hand / finished). */

export type ClassroomStatusKind =
  | "none"
  | "ready"
  | "help"
  | "hand"
  | "finished"
  | "away";

export type ClassroomStatusState = {
  byStudentId: Record<string, ClassroomStatusKind>;
  interactionFrozen: boolean;
};

export function normalizeClassroomStatusState(value: unknown): ClassroomStatusState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<ClassroomStatusState>;
  const valid: ClassroomStatusKind[] = ["none", "ready", "help", "hand", "finished", "away"];
  if (
    !state.byStudentId ||
    typeof state.byStudentId !== "object" ||
    Array.isArray(state.byStudentId) ||
    !Object.values(state.byStudentId).every((status) => valid.includes(status)) ||
    typeof state.interactionFrozen !== "boolean"
  ) {
    return null;
  }
  return {
    byStudentId: state.byStudentId,
    interactionFrozen: state.interactionFrozen,
  };
}

export function createEmptyClassroomStatus(): ClassroomStatusState {
  return {
    byStudentId: {},
    interactionFrozen: false,
  };
}

export function setStudentStatus(
  state: ClassroomStatusState,
  studentId: string,
  status: ClassroomStatusKind,
): ClassroomStatusState {
  if (!studentId) return state;
  const next = { ...state.byStudentId };
  if (status === "none") {
    delete next[studentId];
  } else {
    next[studentId] = status;
  }
  return { ...state, byStudentId: next };
}

export function clearAllStatuses(state: ClassroomStatusState): ClassroomStatusState {
  return { ...state, byStudentId: {} };
}

export function setInteractionFrozen(
  state: ClassroomStatusState,
  frozen: boolean,
): ClassroomStatusState {
  return { ...state, interactionFrozen: frozen };
}

export function countByStatus(
  state: ClassroomStatusState,
): Record<ClassroomStatusKind, number> {
  const counts: Record<ClassroomStatusKind, number> = {
    none: 0,
    ready: 0,
    help: 0,
    hand: 0,
    finished: 0,
    away: 0,
  };
  for (const status of Object.values(state.byStudentId)) {
    counts[status] += 1;
  }
  return counts;
}
