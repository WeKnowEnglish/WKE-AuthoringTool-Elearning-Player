/** Activity timer adapter — shared collaborative-activity timer. */

export {
  addTime,
  expireTimer,
  formatRemaining,
  pauseTimer,
  remainingMs,
  resetTimer,
  resumeTimer,
  startTimer,
} from "@/lib/collaborative-activity/timer";

export { createIdleTimer } from "@/lib/collaborative-activity/domain";
export type { ActivityTimerState } from "@/lib/collaborative-activity/domain";

/**
 * Optional attachment of a session/global timer to drive Collect.
 * Activities read this hint; Virtual Classroom owns the global timer state.
 */
export type TimerAttachment = {
  source: "activity" | "session_global";
  /** When true, activity Collect may fire when the attached timer expires. */
  collectOnExpire: boolean;
};
