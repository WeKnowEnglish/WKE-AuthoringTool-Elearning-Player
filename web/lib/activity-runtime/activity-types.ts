/** VirtualClassroom activity kinds and round identity. */

export type VirtualClassroomActivityKind = "whiteboard" | "document";

export type ActivityParticipationMode =
  | "individual"
  | "pair"
  | "group"
  | "whole_class";

export type ActivityOwnerType = "teacher" | "student" | "group" | "class";

export type ActivityAuthRole = "host" | "player";

/** Round-level phases used by Storage (document-oriented naming preferred). */
export type ActivityRuntimePhase =
  | "waiting"
  | "active"
  | "collected"
  | "review"
  | "revision"
  | "completed";

/**
 * Legacy collaborative-activity / whiteboard phases.
 * Map via `toRuntimePhase` / `fromWhiteboardPhase`.
 */
export type LegacyActivityPhase =
  | "DRAFT"
  | "WAITING"
  | "OPEN"
  | "PAUSED"
  | "COLLECTING"
  | "COLLECTED"
  | "REVIEW"
  | "REVISION"
  | "ENDED";

export type ActivityWorkStatus =
  | "waiting"
  | "active"
  | "submitted"
  | "auto_submitted"
  | "returned"
  | "revising"
  | "completed"
  | "locked"
  | "reviewed";

export type ActivityKindMeta = {
  kind: VirtualClassroomActivityKind;
  label: string;
  description: string;
};

export const VC_ACTIVITY_KIND_META: Record<
  VirtualClassroomActivityKind,
  ActivityKindMeta
> = {
  whiteboard: {
    kind: "whiteboard",
    label: "Whiteboard",
    description: "Bounded drawing and text boards",
  },
  document: {
    kind: "document",
    label: "Document",
    description: "Collaborative writing with Show/Compare review",
  },
};

export const DOCUMENT_ROOM_PREFIX = "wke-doc-";

export function toDocumentRoomId(vcSessionId: string, roundId: string): string {
  return `${DOCUMENT_ROOM_PREFIX}${vcSessionId}-${roundId}`;
}

export function parseDocumentRoomId(
  roomId: string,
): { vcSessionId: string; roundId: string } | null {
  if (!roomId.startsWith(DOCUMENT_ROOM_PREFIX)) return null;
  const rest = roomId.slice(DOCUMENT_ROOM_PREFIX.length);
  const split = rest.indexOf("-");
  if (split <= 0) return null;
  // vc session ids look like vcs_XXXXXX — round id is the remainder after first segment...
  // Format: wke-doc-{vcSessionId}-{roundId}
  // vcSessionId is typically `vcs_JOINCODE` (no extra dashes). roundId may contain dashes.
  const firstDash = rest.indexOf("-");
  if (firstDash < 0) return null;
  const vcSessionId = rest.slice(0, firstDash);
  const roundId = rest.slice(firstDash + 1);
  if (!vcSessionId || !roundId) return null;
  return { vcSessionId, roundId };
}
