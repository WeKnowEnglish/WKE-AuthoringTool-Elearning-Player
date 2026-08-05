/**
 * Class clock for scheduled Virtual Classroom (Wave 1 join loop).
 * Waiting opens T−15; live (students + video) from T−5.
 */

/** Students may enter the waiting landing this early. */
export const CLASS_WAITING_OPEN_MS = 15 * 60 * 1000;

/** Class auto-promotes to live (students + Daily video) this early. */
export const CLASS_LIVE_OPEN_MS = 5 * 60 * 1000;

/** Teachers may open the classroom shell / video this early for prep. */
export const CLASS_TEACHER_EARLY_MS = 60 * 60 * 1000;

export type ClassSessionKind = "scheduled" | "extra";

export type ClassSessionPhase = "prep" | "waiting" | "live" | "ended";

export type ClassLivePhase = "idle" | "waiting" | "live" | "ended" | "none";

export function deriveScheduledClockPhase(input: {
  occurrenceStartsAt: Date | string;
  occurrenceEndsAt?: Date | string | null;
  nowMs?: number;
}): Exclude<ClassLivePhase, "none" | "ended"> | "past" {
  const now = input.nowMs ?? Date.now();
  const start =
    typeof input.occurrenceStartsAt === "string"
      ? new Date(input.occurrenceStartsAt).getTime()
      : input.occurrenceStartsAt.getTime();
  if (!Number.isFinite(start)) return "idle";

  const end = input.occurrenceEndsAt
    ? typeof input.occurrenceEndsAt === "string"
      ? new Date(input.occurrenceEndsAt).getTime()
      : input.occurrenceEndsAt.getTime()
    : start + 60 * 60 * 1000;

  if (Number.isFinite(end) && now > end) return "past";

  if (now >= start - CLASS_LIVE_OPEN_MS) return "live";
  if (now >= start - CLASS_WAITING_OPEN_MS) return "waiting";
  return "idle";
}

/** Persistable class_phase for an active scheduled session given the clock. */
export function clockPhaseToSessionPhase(
  clock: ReturnType<typeof deriveScheduledClockPhase>,
  teacherForcedLive = false,
): ClassSessionPhase {
  if (teacherForcedLive) return "live";
  if (clock === "live") return "live";
  if (clock === "waiting") return "waiting";
  if (clock === "past") return "ended";
  return "prep";
}
