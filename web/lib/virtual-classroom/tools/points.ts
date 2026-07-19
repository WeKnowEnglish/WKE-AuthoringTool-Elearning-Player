/** Session-scoped points (not long-term rewards). */

export type AwardLabel =
  | "point"
  | "participation"
  | "explanation"
  | "teamwork"
  | "improvement"
  | "creativity"
  | "target_language";

export type SessionAwardEvent = {
  at: number;
  studentId: string;
  delta: number;
  label: AwardLabel;
};

export type SessionPointsState = {
  totalsByStudentId: Record<string, number>;
  history: SessionAwardEvent[];
  showLeaderboard: boolean;
};

export function createEmptySessionPoints(): SessionPointsState {
  return {
    totalsByStudentId: {},
    history: [],
    showLeaderboard: true,
  };
}

export function awardPoints(
  state: SessionPointsState,
  input: {
    studentId: string;
    delta: number;
    label?: AwardLabel;
    nowMs?: number;
  },
): SessionPointsState {
  if (!input.studentId || input.delta === 0) return state;
  const delta = Math.max(-50, Math.min(50, Math.trunc(input.delta)));
  const current = state.totalsByStudentId[input.studentId] ?? 0;
  const nextTotal = Math.max(0, current + delta);
  const event: SessionAwardEvent = {
    at: input.nowMs ?? Date.now(),
    studentId: input.studentId,
    delta: nextTotal - current,
    label: input.label ?? "point",
  };
  if (event.delta === 0 && delta < 0 && current === 0) return state;

  return {
    ...state,
    totalsByStudentId: {
      ...state.totalsByStudentId,
      [input.studentId]: nextTotal,
    },
    history: [event, ...state.history].slice(0, 80),
  };
}

export function undoLastAward(state: SessionPointsState): SessionPointsState {
  const last = state.history[0];
  if (!last) return state;
  const current = state.totalsByStudentId[last.studentId] ?? 0;
  const nextTotal = Math.max(0, current - last.delta);
  const totals = { ...state.totalsByStudentId, [last.studentId]: nextTotal };
  return {
    ...state,
    totalsByStudentId: totals,
    history: state.history.slice(1),
  };
}

export function resetSessionPoints(state: SessionPointsState): SessionPointsState {
  return {
    ...state,
    totalsByStudentId: {},
    history: [],
  };
}

export function leaderboard(
  state: SessionPointsState,
): { studentId: string; points: number }[] {
  return Object.entries(state.totalsByStudentId)
    .map(([studentId, points]) => ({ studentId, points }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points || a.studentId.localeCompare(b.studentId));
}
