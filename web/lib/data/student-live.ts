import { unstable_noStore as noStore } from "next/cache";
import { getStudentClassMembership, getStudentClassMemberships } from "@/lib/data/student-classes";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import { getActiveVirtualClassroomForClass } from "@/lib/virtual-classroom/server/session";

function mapSession(
  membership: { classId: string; title: string },
  session: { id: string; joinCode: string; title: string },
): StudentClassLiveSession {
  return {
    classId: membership.classId,
    classTitle: membership.title,
    sessionId: session.id,
    joinCode: session.joinCode,
    sessionTitle: session.title,
  };
}

/** Active Virtual Classroom for one enrolled class (null if not live or not enrolled). */
export async function getActiveLiveSessionForStudentClass(
  classId: string,
): Promise<StudentClassLiveSession | null> {
  noStore();
  const membership = await getStudentClassMembership(classId);
  if (!membership) return null;

  const session = await getActiveVirtualClassroomForClass(classId);
  if (!session) return null;

  return mapSession(membership, session);
}

/** All active Virtual Classroom sessions for the signed-in student's enrolled classes. */
export async function listActiveLiveSessionsForStudent(): Promise<StudentClassLiveSession[]> {
  noStore();
  const memberships = await getStudentClassMemberships();
  const live: StudentClassLiveSession[] = [];

  for (const membership of memberships) {
    const session = await getActiveVirtualClassroomForClass(membership.classId);
    if (!session) continue;
    live.push(mapSession(membership, session));
  }

  return live;
}
