import "server-only";

import { randomBytes } from "node:crypto";
import { LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import { generateJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { createVirtualClassroomInitialStorage } from "@/lib/virtual-classroom/liveblocks/initial-storage";
import {
  classSessionIdFromJoinCode,
  toVirtualClassroomRoomId,
} from "@/lib/virtual-classroom/room-id";
import {
  encodeVcMemberToken,
  formatVcHostCookie,
} from "@/lib/virtual-classroom/session-cookie";
import { ensureVcMember } from "@/lib/virtual-classroom/server/liveblocks-session";
import { createVirtualClassroomSession } from "@/lib/virtual-classroom/server/session";

export type HostVirtualClassroomResult = {
  sessionId: string;
  joinCode: string;
  roomId: string;
  classId: string | null;
  title: string;
  userId: string;
  displayName: string;
  role: "host";
  hostCookie: string;
  memberToken: string;
};

/** Shared bootstrap for class-linked and one-off Virtual Classroom hosts. */
export async function bootstrapVirtualClassroomHost(input: {
  teacher: { userId: string; displayName: string };
  classId: string | null;
  title?: string;
}): Promise<HostVirtualClassroomResult> {
  const secret = assertLiveblocksSecret();
  const joinCode = generateJoinCode();
  const sessionId = classSessionIdFromJoinCode(joinCode);
  const roomId = toVirtualClassroomRoomId(joinCode);
  const hostSecret = randomBytes(24).toString("hex");
  const title =
    input.title?.trim() ||
    (input.classId ? "Virtual Classroom" : "One-off Virtual Classroom");

  await createVirtualClassroomSession({
    id: sessionId,
    classId: input.classId,
    joinCode,
    liveblocksRoomId: roomId,
    title,
    createdBy: input.teacher.userId,
  });

  const liveblocks = new Liveblocks({ secret });
  await liveblocks.createRoom(roomId, { defaultAccesses: [] });

  const initial = createVirtualClassroomInitialStorage({
    sessionId,
    joinCode,
    classId: input.classId ?? "",
    hostUserId: input.teacher.userId,
    title,
  });
  const root = new LiveObject(initial);
  const plain = toPlainLson(root) as PlainLsonObject;
  try {
    await liveblocks.initializeStorageDocument(roomId, plain);
  } catch {
    // client initialStorage fallback
  }

  await ensureVcMember({
    roomId,
    userId: input.teacher.userId,
    displayName: input.teacher.displayName,
    role: "host",
  });

  const memberToken = encodeVcMemberToken({
    sessionId,
    joinCode,
    roomId,
    userId: input.teacher.userId,
    displayName: input.teacher.displayName,
    role: "host",
  });

  return {
    sessionId,
    joinCode,
    roomId,
    classId: input.classId,
    title,
    userId: input.teacher.userId,
    displayName: input.teacher.displayName,
    role: "host",
    hostCookie: formatVcHostCookie(joinCode, hostSecret),
    memberToken,
  };
}
