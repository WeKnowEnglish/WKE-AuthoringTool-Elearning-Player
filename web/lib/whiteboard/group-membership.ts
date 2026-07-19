/**
 * Group membership helpers for whiteboard (WB-3 orphan-and-lock).
 * Pure functions — safe for unit tests.
 */

import { boardIdForScope } from "@/lib/whiteboard/domain";

export type WhiteboardGroupRecord = {
  id: string;
  name: string;
  memberIds: string[];
  leaderId: string | null;
};

export type AssignWhiteboardGroupsInput = {
  groups: { id: string; name: string; memberIds: string[]; leaderId?: string | null }[];
};

export type AssignWhiteboardGroupsPlan = {
  groups: WhiteboardGroupRecord[];
  activeBoardIds: string[];
  orphanOwnerIds: string[];
};

export function normalizeWhiteboardAssignPayload(
  input: AssignWhiteboardGroupsInput,
): WhiteboardGroupRecord[] {
  return input.groups
    .map((g) => {
      const memberIds = [...new Set(g.memberIds.filter(Boolean))];
      const leaderId =
        g.leaderId && memberIds.includes(g.leaderId) ? g.leaderId : (memberIds[0] ?? null);
      return {
        id: g.id,
        name: (g.name || `Group ${g.id}`).trim() || `Group ${g.id}`,
        memberIds,
        leaderId,
      };
    })
    .filter((g) => g.id && g.memberIds.length > 0);
}

export function planAssignWhiteboardGroups(input: {
  incoming: AssignWhiteboardGroupsInput;
  existingGroupOwnerIds: string[];
}): AssignWhiteboardGroupsPlan {
  const groups = normalizeWhiteboardAssignPayload(input.incoming);
  const activeIds = new Set(groups.map((g) => g.id));
  const activeBoardIds = groups.map((g) =>
    boardIdForScope({ type: "group", groupId: g.id }),
  );
  const orphanOwnerIds = input.existingGroupOwnerIds.filter((id) => !activeIds.has(id));
  return { groups, activeBoardIds, orphanOwnerIds };
}

export function findWhiteboardGroupForUser(
  groups: WhiteboardGroupRecord[],
  userId: string,
): WhiteboardGroupRecord | null {
  return groups.find((g) => g.memberIds.includes(userId)) ?? null;
}

/**
 * True when a board may be pushed for Show/Compare.
 * Orphaned group boards (removed from Storage `groups`) are never pushable.
 * Status is otherwise left to the teacher (Show during Active remains allowed).
 */
export function canPushBoardForReview(input: {
  status: string | null | undefined;
  ownerType: string | null | undefined;
  ownerId: string | null | undefined;
  /** Active group ids from Storage `groups` (orphans omitted). */
  activeGroupIds?: string[];
}): boolean {
  if (input.ownerType === "group") {
    const ownerId = input.ownerId ?? "";
    const active = input.activeGroupIds ?? [];
    if (active.length > 0 && !active.includes(ownerId)) return false;
  }
  return true;
}
