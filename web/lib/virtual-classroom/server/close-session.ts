import "server-only";

import { clearDailyRoomOnSessionEnd } from "@/lib/daily/session-room";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import {
  deleteLiveblocksRooms,
  markVcSessionEndedInStorage,
} from "@/lib/virtual-classroom/server/liveblocks-session";
import {
  endVirtualClassroomSession,
  listWhiteboardRoomsForClassSession,
} from "@/lib/virtual-classroom/server/session";

/** Full server-side teardown for a Virtual Classroom session (DB + Liveblocks + Daily). */
export async function finalizeVirtualClassroomSessionClose(
  session: Pick<
    VirtualClassroomSessionRecord,
    "id" | "status" | "liveblocksRoomId"
  >,
): Promise<void> {
  if (session.status === "ended") return;

  await markVcSessionEndedInStorage(session.liveblocksRoomId);
  await endVirtualClassroomSession(session.id);
  try {
    await clearDailyRoomOnSessionEnd(session.id);
  } catch {
    // Non-fatal once DB row is ended.
  }

  const whiteboardRooms = await listWhiteboardRoomsForClassSession(session.id);
  await deleteLiveblocksRooms([session.liveblocksRoomId, ...whiteboardRooms]);
}
