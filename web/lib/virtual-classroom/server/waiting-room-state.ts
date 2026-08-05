import "server-only";

import { listSessionAttendanceRecords } from "@/lib/daily/attendance";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import type { WaitingRoomState } from "@/lib/virtual-classroom/session-history-types";

export async function getWaitingRoomState(input: {
  sessionId: string;
  viewerUserId?: string | null;
  occurrenceLabel?: string | null;
  autoLiveAt?: string | null;
}): Promise<WaitingRoomState | null> {
  const session = await getVirtualClassroomSessionById(input.sessionId);
  if (!session || session.status !== "active") return null;

  const records = await listSessionAttendanceRecords(input.sessionId);

  const teacherPresent = records.some(
    (row) =>
      row.role === "teacher" &&
      ((Boolean(row.lobbyFirstJoinedAt) && !row.lobbyLastLeftAt) ||
        (row.videoJoinCount > 0 && !row.videoLastLeftAt)),
  );

  const waitingStudents = records.filter(
    (row) =>
      row.role !== "teacher" &&
      Boolean(row.lobbyFirstJoinedAt) &&
      !row.lobbyLastLeftAt,
  );

  const waitingCount = waitingStudents.length;
  const classmatesWaiting = input.viewerUserId
    ? waitingStudents.filter((row) => row.userId !== input.viewerUserId).length
    : waitingCount;

  const phase =
    session.classPhase === "live"
      ? "live"
      : session.classPhase === "waiting"
        ? "waiting"
        : session.classPhase === "prep"
          ? "prep"
          : session.classPhase === "ended"
            ? "ended"
            : "idle";

  return {
    sessionId: session.id,
    classTitle: session.title,
    occurrenceLabel: input.occurrenceLabel ?? null,
    autoLiveAt: input.autoLiveAt ?? null,
    phase,
    teacherPresent,
    classmatesWaiting,
    waitingCount,
  };
}
