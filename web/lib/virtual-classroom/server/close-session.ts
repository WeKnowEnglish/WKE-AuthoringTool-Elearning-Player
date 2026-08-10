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
import { endClassroomRuntimeSnapshot } from "@/lib/virtual-classroom/server/runtime-snapshot";

/** Full server-side teardown for a Virtual Classroom session (DB + Liveblocks + Daily). */
export async function finalizeVirtualClassroomSessionClose(
  session: Pick<
    VirtualClassroomSessionRecord,
    "id" | "status" | "liveblocksRoomId"
  >,
  actorUserId: string,
): Promise<void> {
  if (session.status === "ended") return;

  await markVcSessionEndedInStorage(session.liveblocksRoomId);
  // Persist the terminal state before deleting the legacy realtime room. This
  // makes reconnect recovery deterministic during and after the migration.
  await endClassroomRuntimeSnapshot({
    sessionId: session.id,
    actorUserId,
  }).catch(() => null);
  const ended = await endVirtualClassroomSession(session.id);
  if (!ended) {
    throw new Error(
      "Could not persist session end (is SUPABASE_SERVICE_ROLE_KEY configured?).",
    );
  }
  try {
    await clearDailyRoomOnSessionEnd(session.id);
  } catch {
    // Non-fatal once DB row is ended.
  }

  const whiteboardRooms = await listWhiteboardRoomsForClassSession(session.id);
  await deleteLiveblocksRooms([session.liveblocksRoomId, ...whiteboardRooms]);
}
