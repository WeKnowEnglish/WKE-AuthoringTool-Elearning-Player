/**
 * Document round Liveblocks auth (Chunk 0.5 stub).
 * Reuses Virtual Classroom host/member cookies keyed by join code derived from
 * `wke-doc-{vcSessionId}-{roundId}` where vcSessionId is `vcs_{JOINCODE}`.
 * Document-specific cookies land in Chunk 1.
 */

import { parseDocumentRoomId } from "@/lib/document-activity/domain";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
} from "@/lib/virtual-classroom/session-cookie";

export function joinCodeFromDocumentVcSessionId(vcSessionId: string): string | null {
  if (!vcSessionId.startsWith("vcs_")) return null;
  const code = vcSessionId.slice("vcs_".length);
  return code.length > 0 ? code.toUpperCase() : null;
}

export function canAccessDocumentRoom(input: {
  room: string;
  role: "host" | "player";
  hostCookie: string | null;
  memberCookie: string | null;
}): boolean {
  const parsed = parseDocumentRoomId(input.room);
  if (!parsed) return false;
  const joinCode = joinCodeFromDocumentVcSessionId(parsed.vcSessionId);
  if (!joinCode) return false;

  const member = decodeVcMemberToken(input.memberCookie);
  if (member?.joinCode === joinCode && member.sessionId === parsed.vcSessionId) {
    return true;
  }

  if (input.role === "host") {
    return vcHostMatchesJoinCode(input.hostCookie, joinCode);
  }

  return false;
}
