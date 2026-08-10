import "server-only";

import {
  listSessionAttendanceRecords,
  type SessionAttendanceRecord,
} from "@/lib/daily/attendance";

const ACTIVE_LOBBY_MAX_AGE_MS = 90_000;

export function activeClassroomStudentIds(records: SessionAttendanceRecord[]): string[] {
  const now = Date.now();
  return [...new Set(
    records
      .filter(
        (record) =>
          record.role === "student" &&
          Boolean(record.userId) &&
          ((Boolean(record.lobbyFirstJoinedAt) &&
            !record.lobbyLastLeftAt &&
            Boolean(record.lobbyLastSeenAt) &&
            now - new Date(record.lobbyLastSeenAt as string).getTime() < ACTIVE_LOBBY_MAX_AGE_MS) ||
            (record.videoJoinCount > 0 && !record.videoLastLeftAt)),
      )
      .map((record) => record.userId as string),
  )];
}

/** Server-readable roster for teacher tools; Presence itself remains browser-only. */
export async function listActiveClassroomStudentIds(sessionId: string): Promise<string[]> {
  return activeClassroomStudentIds(await listSessionAttendanceRecords(sessionId));
}
