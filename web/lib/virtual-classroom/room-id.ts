import { isValidJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { VC_SESSION_ROOM_PREFIX } from "@/lib/virtual-classroom/domain";

export function toVirtualClassroomRoomId(joinCode: string): string {
  return `${VC_SESSION_ROOM_PREFIX}${joinCode.toUpperCase()}`;
}

export function joinCodeFromVirtualClassroomRoom(room: string): string | null {
  if (!room.startsWith(VC_SESSION_ROOM_PREFIX)) return null;
  const code = room.slice(VC_SESSION_ROOM_PREFIX.length);
  return isValidJoinCode(code) ? code : null;
}

export function classSessionIdFromJoinCode(joinCode: string): string {
  return `vcs_${joinCode.toUpperCase()}`;
}
