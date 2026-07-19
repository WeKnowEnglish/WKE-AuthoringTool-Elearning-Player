import { decodeVcMemberToken, vcHostMatchesJoinCode } from "@/lib/virtual-classroom/session-cookie";
import { joinCodeFromVirtualClassroomRoom } from "@/lib/virtual-classroom/room-id";

export function canAccessVirtualClassroomRoom(input: {
  room: string;
  role: "host" | "player";
  hostCookie: string | null;
  memberCookie: string | null;
}): boolean {
  const joinCode = joinCodeFromVirtualClassroomRoom(input.room);
  if (!joinCode) return false;

  const member = decodeVcMemberToken(input.memberCookie);
  if (member?.joinCode === joinCode && member.roomId === input.room) {
    return true;
  }

  if (input.role === "host") {
    return vcHostMatchesJoinCode(input.hostCookie, joinCode);
  }

  return false;
}
