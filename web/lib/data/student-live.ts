import { unstable_noStore as noStore } from "next/cache";
import { getClassLiveState } from "@/lib/class-schedule/live-state";
import { getStudentClassMembership, getStudentClassMemberships } from "@/lib/data/student-classes";
import {
  studentLandingPath,
  type StudentClassLiveSession,
} from "@/lib/student-live/types";

function mapFromLiveState(
  membership: { classId: string; title: string },
  state: Awaited<ReturnType<typeof getClassLiveState>>,
): StudentClassLiveSession | null {
  if (!state.sessionId || !state.joinCode) return null;
  if (state.phase !== "waiting" && state.phase !== "live") return null;
  if (!state.canStudentEnterWaiting && !state.canStudentEnterLive) return null;

  return {
    classId: membership.classId,
    classTitle: membership.title,
    sessionId: state.sessionId,
    joinCode: state.joinCode,
    sessionTitle: state.sessionTitle ?? "Virtual Classroom",
    phase: state.phase,
    kind: state.kind,
    classPhase: state.classPhase,
    occurrenceLabel: state.occurrenceLabel,
    meetingSlotId: state.meetingSlotId,
    canEnterWaiting: state.canStudentEnterWaiting,
    canEnterLive: state.canStudentEnterLive,
    landingPath: studentLandingPath(state.sessionId, state.phase),
  };
}

/** Waiting or live VC for one enrolled class (null if idle / none). */
export async function getActiveLiveSessionForStudentClass(
  classId: string,
): Promise<StudentClassLiveSession | null> {
  noStore();
  const membership = await getStudentClassMembership(classId);
  if (!membership) return null;

  const state = await getClassLiveState(classId);
  return mapFromLiveState(membership, state);
}

/** All waiting/live VC sessions for the signed-in student's enrolled classes. */
export async function listActiveLiveSessionsForStudent(): Promise<StudentClassLiveSession[]> {
  noStore();
  const memberships = await getStudentClassMemberships();
  const live: StudentClassLiveSession[] = [];

  for (const membership of memberships) {
    const state = await getClassLiveState(membership.classId);
    const mapped = mapFromLiveState(membership, state);
    if (mapped) live.push(mapped);
  }

  return live;
}
