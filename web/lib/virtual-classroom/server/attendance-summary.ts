import "server-only";

import {
  listSessionAttendanceRecords,
  type SessionAttendanceRecord,
} from "@/lib/daily/attendance";
import { getClassRoster } from "@/lib/data/teacher-classes";

export type AttendancePresence = "absent" | "lobby" | "video" | "left";

export type SessionAttendanceParticipant = {
  participantKey: string;
  userId: string | null;
  displayName: string;
  username: string | null;
  role: SessionAttendanceRecord["role"];
  onRoster: boolean;
  presence: AttendancePresence;
  inLiveblocks: boolean;
  lobbyFirstJoinedAt: string | null;
  videoFirstJoinedAt: string | null;
  videoTotalSeconds: number;
  source: SessionAttendanceRecord["source"];
};

export type SessionAttendanceSummary = {
  sessionId: string;
  classId: string | null;
  participants: SessionAttendanceParticipant[];
  rosterTotal: number | null;
  presentLobby: number;
  presentVideo: number;
  updatedAt: string;
};

function resolvePresence(record: SessionAttendanceRecord | null): AttendancePresence {
  if (!record) return "absent";
  const inLobby =
    Boolean(record.lobbyFirstJoinedAt) && !record.lobbyLastLeftAt;
  const inVideo = record.videoJoinCount > 0 && !record.videoLastLeftAt;
  if (inVideo) return "video";
  if (inLobby) return "lobby";
  if (record.lobbyFirstJoinedAt || record.videoJoinCount > 0) return "left";
  return "absent";
}

function mapRecordToParticipant(input: {
  record: SessionAttendanceRecord;
  displayName: string;
  username: string | null;
  onRoster: boolean;
  inLiveblocks: boolean;
}): SessionAttendanceParticipant {
  return {
    participantKey: input.record.participantKey,
    userId: input.record.userId,
    displayName: input.displayName,
    username: input.username,
    role: input.record.role,
    onRoster: input.onRoster,
    presence: resolvePresence(input.record),
    inLiveblocks: input.inLiveblocks,
    lobbyFirstJoinedAt: input.record.lobbyFirstJoinedAt,
    videoFirstJoinedAt: input.record.videoFirstJoinedAt,
    videoTotalSeconds: input.record.videoTotalSeconds,
    source: input.record.source,
  };
}

export async function buildSessionAttendanceSummary(input: {
  sessionId: string;
  classId: string | null;
}): Promise<SessionAttendanceSummary> {
  const records = await listSessionAttendanceRecords(input.sessionId);
  const recordByUserId = new Map<string, SessionAttendanceRecord>();
  for (const record of records) {
    if (record.userId) recordByUserId.set(record.userId, record);
  }

  const participants: SessionAttendanceParticipant[] = [];
  const seenKeys = new Set<string>();

  if (input.classId) {
    const roster = await getClassRoster(input.classId);
    for (const student of roster) {
      const record = recordByUserId.get(student.studentId) ?? null;
      const key = record?.participantKey ?? student.studentId;
      seenKeys.add(key);
      participants.push(
        mapRecordToParticipant({
          record: record ?? {
            participantKey: student.studentId,
            userId: student.studentId,
            role: "student",
            lobbyFirstJoinedAt: null,
            lobbyLastLeftAt: null,
            lobbyLastSeenAt: null,
            lobbyJoinCount: 0,
            videoFirstJoinedAt: null,
            videoLastLeftAt: null,
            videoTotalSeconds: 0,
            videoJoinCount: 0,
            source: "provisional",
          },
          displayName: student.displayName,
          username: student.username,
          onRoster: true,
          inLiveblocks: false,
        }),
      );
    }
  }

  for (const record of records) {
    if (seenKeys.has(record.participantKey)) continue;
    if (record.role === "teacher") continue;
    const displayName =
      record.role === "guest"
        ? `Guest ${record.participantKey.slice(0, 8)}`
        : record.participantKey.slice(0, 8);
    participants.push(
      mapRecordToParticipant({
        record,
        displayName,
        username: null,
        onRoster: false,
        inLiveblocks: false,
      }),
    );
  }

  const presentLobby = participants.filter((p) => p.presence === "lobby").length;
  const presentVideo = participants.filter((p) => p.presence === "video").length;

  return {
    sessionId: input.sessionId,
    classId: input.classId,
    participants,
    rosterTotal: input.classId ? participants.filter((p) => p.onRoster).length : null,
    presentLobby,
    presentVideo,
    updatedAt: new Date().toISOString(),
  };
}
