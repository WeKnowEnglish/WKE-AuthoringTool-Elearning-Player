import "server-only";

import {
  CLASS_LIVE_OPEN_MS,
  CLASS_TEACHER_EARLY_MS,
  CLASS_WAITING_OPEN_MS,
  deriveScheduledClockPhase,
  type ClassLivePhase,
} from "@/lib/class-schedule/class-clock";
import type { ClassLiveState } from "@/lib/class-schedule/live-state-types";
import type { LiveClassMeetingWindow } from "@/lib/class-schedule/next-meeting";
import { occurrenceStartsMatch } from "@/lib/class-schedule/occurrence-match";
import { resolveClassLiveMeeting } from "@/lib/class-schedule/trial-meeting";
import { listMeetingSlotsForClassServiceRole } from "@/lib/daily/schedule-bind";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import {
  getActiveVirtualClassroomForClass,
  hasTeacherDismissedOccurrence,
} from "@/lib/virtual-classroom/server/session";

export type { ClassLiveState } from "@/lib/class-schedule/live-state-types";

function emptyState(partial?: Partial<ClassLiveState>): ClassLiveState {
  return {
    phase: "none",
    kind: null,
    occurrenceStartsAt: null,
    occurrenceEndsAt: null,
    occurrenceLabel: null,
    meetingSlotId: null,
    sessionId: null,
    joinCode: null,
    sessionTitle: null,
    classPhase: null,
    canStudentEnterWaiting: false,
    canStudentEnterLive: false,
    canTeacherOpenEarly: false,
    canTeacherJoinVideo: false,
    canTeacherStartNow: false,
    autoLiveAt: null,
    waitingOpensAt: null,
    ...partial,
  };
}

/**
 * An active persisted waiting/live session is the connection authority.
 * Schedule resolution enriches the card, but cannot hide a room the teacher
 * has already opened.
 */
export function stateFromOpenClassSession(
  session: VirtualClassroomSessionRecord,
  meeting: LiveClassMeetingWindow | null,
): ClassLiveState | null {
  if (
    session.status !== "active" ||
    (session.classPhase !== "waiting" && session.classPhase !== "live")
  ) {
    return null;
  }

  const meetingMatches = Boolean(
    meeting &&
      session.occurrenceStartsAt &&
      occurrenceStartsMatch(session.occurrenceStartsAt, meeting.startsAt),
  );
  const occurrenceStartsAt =
    session.occurrenceStartsAt ??
    (meetingMatches ? meeting?.startsAt.toISOString() ?? null : null);
  const occurrenceEndsAt =
    session.occurrenceEndsAt ??
    (meetingMatches ? meeting?.endsAt.toISOString() ?? null : null);
  const startMs = occurrenceStartsAt
    ? new Date(occurrenceStartsAt).getTime()
    : Number.NaN;
  const isWaiting = session.classPhase === "waiting";

  return emptyState({
    phase: isWaiting ? "waiting" : "live",
    kind: session.sessionKind,
    occurrenceStartsAt,
    occurrenceEndsAt,
    occurrenceLabel: meetingMatches ? meeting?.label ?? null : null,
    meetingSlotId: session.meetingSlotId,
    sessionId: session.id,
    joinCode: session.joinCode,
    sessionTitle: session.title,
    classPhase: session.classPhase,
    canStudentEnterWaiting: isWaiting,
    canStudentEnterLive: !isWaiting,
    canTeacherJoinVideo: true,
    canTeacherStartNow: isWaiting,
    waitingOpensAt: Number.isFinite(startMs)
      ? new Date(startMs - CLASS_WAITING_OPEN_MS).toISOString()
      : null,
    autoLiveAt: Number.isFinite(startMs)
      ? new Date(startMs - CLASS_LIVE_OPEN_MS).toISOString()
      : null,
  });
}

function sessionAllowsStudentEntry(
  session: VirtualClassroomSessionRecord | null,
): boolean {
  if (!session || session.status !== "active") return false;
  return (
    session.classPhase === "waiting" ||
    session.classPhase === "live" ||
    session.classPhase === "prep"
  );
}

/**
 * Unified schedule + VC state for a class. Used by student CTAs, Teach panel, clock.
 */
export async function getClassLiveState(
  classId: string,
  nowMs = Date.now(),
): Promise<ClassLiveState> {
  const [slots, activeSession] = await Promise.all([
    listMeetingSlotsForClassServiceRole(classId),
    getActiveVirtualClassroomForClass(classId),
  ]);

  const liveMeeting = await resolveClassLiveMeeting(classId, slots, new Date(nowMs), {
    lookAheadMs: 24 * 60 * 60 * 1000,
    postEndGraceMs: 15 * 60 * 1000,
  });

  const openSessionState = activeSession
    ? stateFromOpenClassSession(activeSession, liveMeeting)
    : null;
  if (openSessionState) return openSessionState;

  if (activeSession?.sessionKind === "extra" || (activeSession && !liveMeeting)) {
    if (activeSession && activeSession.status === "active") {
      const phase =
        activeSession.classPhase === "ended"
          ? "ended"
          : activeSession.classPhase === "prep"
            ? "waiting"
            : activeSession.classPhase === "waiting"
              ? "waiting"
              : "live";
      const extraLive =
        activeSession.classPhase === "live" || activeSession.classPhase === "waiting";
      return emptyState({
        phase,
        kind: "extra",
        sessionId: activeSession.id,
        joinCode: activeSession.joinCode,
        sessionTitle: activeSession.title,
        classPhase: activeSession.classPhase,
        canStudentEnterWaiting: false,
        canStudentEnterLive: extraLive,
        canTeacherOpenEarly: false,
        canTeacherJoinVideo: true,
        canTeacherStartNow: false,
      });
    }
  }

  if (!liveMeeting && !activeSession) {
    return emptyState({ phase: "none" });
  }

  if (!liveMeeting && activeSession) {
    // Active scheduled-looking session without current meeting window.
    return emptyState({
      phase: activeSession.status === "ended" ? "ended" : "live",
      kind: activeSession.sessionKind,
      sessionId: activeSession.id,
      joinCode: activeSession.joinCode,
      sessionTitle: activeSession.title,
      classPhase: activeSession.classPhase,
      canStudentEnterLive: activeSession.status === "active",
      canTeacherJoinVideo: activeSession.status === "active",
    });
  }

  return buildScheduledState(
    liveMeeting!,
    activeSession,
    nowMs,
    await hasTeacherDismissedOccurrence({
      classId,
      meetingSlotId: liveMeeting!.slot.id,
      occurrenceStartsAt: liveMeeting!.startsAt,
      occurrenceEndsAt: liveMeeting!.endsAt,
    }),
  );
}

function buildScheduledState(
  meeting: LiveClassMeetingWindow,
  activeSession: VirtualClassroomSessionRecord | null,
  nowMs: number,
  occurrenceDismissed: boolean,
): ClassLiveState {
  const startMs = meeting.startsAt.getTime();
  const clock = deriveScheduledClockPhase({
    occurrenceStartsAt: meeting.startsAt,
    occurrenceEndsAt: meeting.endsAt,
    nowMs,
  });

  const waitingOpensAt = new Date(startMs - CLASS_WAITING_OPEN_MS).toISOString();
  const autoLiveAt = new Date(startMs - CLASS_LIVE_OPEN_MS).toISOString();

  if (clock === "past") {
    return emptyState({
      phase: "ended",
      kind: "scheduled",
      occurrenceStartsAt: meeting.startsAt.toISOString(),
      occurrenceEndsAt: meeting.endsAt.toISOString(),
      occurrenceLabel: meeting.label,
      meetingSlotId: meeting.source === "trial" ? null : meeting.slot.id,
      waitingOpensAt,
      autoLiveAt,
    });
  }

  const phase: ClassLivePhase =
    occurrenceDismissed && !activeSession ? "idle" : clock;
  const sessionOk = sessionAllowsStudentEntry(activeSession);
  const teacherForcedLive = activeSession?.classPhase === "live";

  const effectivePhase: ClassLivePhase =
    teacherForcedLive && (phase === "idle" || phase === "waiting")
      ? "live"
      : phase;

  const canStudentEnterWaiting =
    effectivePhase === "waiting" &&
    Boolean(activeSession && activeSession.status === "active");
  const canStudentEnterLive =
    effectivePhase === "live" &&
    Boolean(activeSession && activeSession.status === "active");

  const withinTeacherEarly =
    nowMs >= startMs - CLASS_TEACHER_EARLY_MS && nowMs < startMs - CLASS_LIVE_OPEN_MS;

  return emptyState({
    phase: effectivePhase,
    kind: "scheduled",
    occurrenceStartsAt: meeting.startsAt.toISOString(),
    occurrenceEndsAt: meeting.endsAt.toISOString(),
    occurrenceLabel: meeting.label,
    meetingSlotId: meeting.source === "trial" ? null : meeting.slot.id,
    sessionId: activeSession?.id ?? null,
    joinCode: activeSession?.joinCode ?? null,
    sessionTitle: activeSession?.title ?? null,
    classPhase: activeSession?.classPhase ?? null,
    canStudentEnterWaiting,
    canStudentEnterLive,
    canTeacherOpenEarly:
      (phase === "idle" || phase === "waiting") &&
      (withinTeacherEarly || phase === "waiting") &&
      (!activeSession || activeSession.classPhase !== "live"),
    canTeacherJoinVideo: Boolean(
      activeSession &&
        activeSession.status === "active" &&
        (effectivePhase === "waiting" ||
          effectivePhase === "live" ||
          activeSession.classPhase === "prep"),
    ),
    canTeacherStartNow:
      Boolean(activeSession) || phase === "waiting" || phase === "live" || withinTeacherEarly,
    waitingOpensAt,
    autoLiveAt,
    // sessionOk unused except clarity — keep for future
    ...(sessionOk ? {} : {}),
  });
}

export type { LiveClassMeetingWindow };
