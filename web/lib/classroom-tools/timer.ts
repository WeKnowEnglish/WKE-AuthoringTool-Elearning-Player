/** Shared classroom timer (countdown + stopwatch). Used by VC and teacher toolkit. */

export type GlobalTimerMode = "countdown" | "stopwatch";
export type GlobalTimerStatus = "idle" | "running" | "paused" | "expired";

export type GlobalTimerState = {
  mode: GlobalTimerMode;
  status: GlobalTimerStatus;
  durationMs: number;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedPausedMs: number;
  visibleToStudents: boolean;
};

export function normalizeGlobalTimerState(value: unknown): GlobalTimerState | null {
  if (!value || typeof value !== "object") return null;
  const timer = value as Partial<GlobalTimerState>;
  if (
    (timer.mode !== "countdown" && timer.mode !== "stopwatch") ||
    (timer.status !== "idle" &&
      timer.status !== "running" &&
      timer.status !== "paused" &&
      timer.status !== "expired") ||
    typeof timer.durationMs !== "number" ||
    !Number.isFinite(timer.durationMs) ||
    typeof timer.accumulatedPausedMs !== "number" ||
    !Number.isFinite(timer.accumulatedPausedMs) ||
    typeof timer.visibleToStudents !== "boolean" ||
    (timer.startedAt !== null && typeof timer.startedAt !== "number") ||
    (timer.pausedAt !== null && typeof timer.pausedAt !== "number")
  ) {
    return null;
  }
  return {
    mode: timer.mode,
    status: timer.status,
    durationMs: Math.max(0, timer.durationMs),
    startedAt: timer.startedAt,
    pausedAt: timer.pausedAt,
    accumulatedPausedMs: Math.max(0, timer.accumulatedPausedMs),
    visibleToStudents: timer.visibleToStudents,
  };
}

export function createIdleGlobalTimer(
  durationMs = 60_000,
  mode: GlobalTimerMode = "countdown",
): GlobalTimerState {
  return {
    mode,
    status: "idle",
    durationMs,
    startedAt: null,
    pausedAt: null,
    accumulatedPausedMs: 0,
    visibleToStudents: true,
  };
}

/** Accept recent client click time while rejecting stale or forged timestamps. */
export function resolveTimerActionTime(
  requestedAt: unknown,
  serverNowMs: number,
): number {
  if (
    typeof requestedAt === "number" &&
    Number.isFinite(requestedAt) &&
    Math.abs(serverNowMs - requestedAt) <= 30_000
  ) {
    return requestedAt;
  }
  return serverNowMs;
}

export function remainingMs(timer: GlobalTimerState, nowMs: number): number {
  if (timer.mode === "stopwatch") return 0;
  if (timer.status === "idle") return timer.durationMs;
  if (timer.status === "expired") return 0;

  if (timer.status === "paused") {
    if (timer.startedAt == null || timer.pausedAt == null) return timer.durationMs;
    const elapsed = timer.pausedAt - timer.startedAt - timer.accumulatedPausedMs;
    return Math.max(0, timer.durationMs - elapsed);
  }

  if (timer.startedAt == null) return timer.durationMs;
  const elapsed = nowMs - timer.startedAt - timer.accumulatedPausedMs;
  return Math.max(0, timer.durationMs - elapsed);
}

export function elapsedMs(timer: GlobalTimerState, nowMs: number): number {
  if (timer.mode !== "stopwatch") {
    return Math.max(0, timer.durationMs - remainingMs(timer, nowMs));
  }
  if (timer.status === "idle" || timer.startedAt == null) return 0;
  if (timer.status === "paused" && timer.pausedAt != null) {
    return Math.max(0, timer.pausedAt - timer.startedAt - timer.accumulatedPausedMs);
  }
  return Math.max(0, nowMs - timer.startedAt - timer.accumulatedPausedMs);
}

export function formatTimerMs(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function startGlobalTimer(
  timer: GlobalTimerState,
  nowMs: number,
  durationMs?: number,
): GlobalTimerState {
  const duration = durationMs ?? timer.durationMs;
  return {
    ...timer,
    status: "running",
    durationMs: duration,
    startedAt: nowMs,
    pausedAt: null,
    accumulatedPausedMs: 0,
  };
}

export function pauseGlobalTimer(timer: GlobalTimerState, nowMs: number): GlobalTimerState {
  if (timer.status !== "running") return timer;
  return { ...timer, status: "paused", pausedAt: nowMs };
}

export function resumeGlobalTimer(timer: GlobalTimerState, nowMs: number): GlobalTimerState {
  if (timer.status !== "paused" || timer.pausedAt == null) return timer;
  return {
    ...timer,
    status: "running",
    accumulatedPausedMs: timer.accumulatedPausedMs + (nowMs - timer.pausedAt),
    pausedAt: null,
  };
}

export function addGlobalTime(timer: GlobalTimerState, milliseconds: number): GlobalTimerState {
  if (timer.mode === "stopwatch") return timer;
  return {
    ...timer,
    durationMs: Math.max(0, timer.durationMs + milliseconds),
    status: timer.status === "expired" ? "running" : timer.status,
  };
}

export function resetGlobalTimer(
  timer: GlobalTimerState,
  durationMs?: number,
): GlobalTimerState {
  return {
    ...timer,
    status: "idle",
    durationMs: durationMs ?? timer.durationMs,
    startedAt: null,
    pausedAt: null,
    accumulatedPausedMs: 0,
  };
}

export function expireGlobalTimer(timer: GlobalTimerState): GlobalTimerState {
  if (timer.mode === "stopwatch") return timer;
  return { ...timer, status: "expired" };
}

export function setGlobalTimerMode(
  timer: GlobalTimerState,
  mode: GlobalTimerMode,
): GlobalTimerState {
  return {
    ...createIdleGlobalTimer(timer.durationMs, mode),
    visibleToStudents: timer.visibleToStudents,
  };
}

export function maybeExpireCountdown(
  timer: GlobalTimerState,
  nowMs: number,
): GlobalTimerState {
  if (timer.mode !== "countdown" || timer.status !== "running") return timer;
  if (remainingMs(timer, nowMs) <= 0) return expireGlobalTimer(timer);
  return timer;
}
