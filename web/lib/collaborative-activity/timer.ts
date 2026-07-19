import type { ActivityTimerState } from "@/lib/collaborative-activity/domain";

export function remainingMs(timer: ActivityTimerState, nowMs: number): number {
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

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function startTimer(
  timer: ActivityTimerState,
  durationMs: number,
  nowMs: number,
): ActivityTimerState {
  return {
    status: "running",
    durationMs,
    startedAt: nowMs,
    pausedAt: null,
    accumulatedPausedMs: 0,
  };
}

export function pauseTimer(timer: ActivityTimerState, nowMs: number): ActivityTimerState {
  if (timer.status !== "running") return timer;
  return { ...timer, status: "paused", pausedAt: nowMs };
}

export function resumeTimer(timer: ActivityTimerState, nowMs: number): ActivityTimerState {
  if (timer.status !== "paused" || timer.pausedAt == null) return timer;
  return {
    ...timer,
    status: "running",
    accumulatedPausedMs: timer.accumulatedPausedMs + (nowMs - timer.pausedAt),
    pausedAt: null,
  };
}

export function addTime(timer: ActivityTimerState, milliseconds: number): ActivityTimerState {
  return {
    ...timer,
    durationMs: timer.durationMs + milliseconds,
    status: timer.status === "expired" ? "running" : timer.status,
  };
}

export function resetTimer(durationMs: number): ActivityTimerState {
  return {
    status: "idle",
    durationMs,
    startedAt: null,
    pausedAt: null,
    accumulatedPausedMs: 0,
  };
}

export function expireTimer(timer: ActivityTimerState): ActivityTimerState {
  return { ...timer, status: "expired" };
}
