/**
 * Group membership helpers for document activity (Chunk 4a).
 * Pure functions — safe for unit tests.
 */

import {
  documentIdForGroup,
  documentIdForStudent,
  documentIdForWholeClass,
  type GroupSubmitPolicy,
  type SessionGroupRef,
} from "@/lib/activity-runtime/group-adapter";
import { canGroupMemberSubmit } from "@/lib/collaborative-activity/group-policy";

export type DocumentGroupRecord = {
  id: string;
  name: string;
  memberIds: string[];
  leaderId: string | null;
};

export type AssignGroupsInput = {
  groups: { id: string; name: string; memberIds: string[]; leaderId?: string | null }[];
};

export type AssignGroupsPlan = {
  /** Groups kept after filtering empty membership. */
  groups: DocumentGroupRecord[];
  /** Group document ids to ensure/create. */
  activeDocumentIds: string[];
  /** Existing group ownerIds that should be locked (orphaned). */
  orphanOwnerIds: string[];
};

export function normalizeAssignPayload(input: AssignGroupsInput): DocumentGroupRecord[] {
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

export function planAssignGroups(input: {
  incoming: AssignGroupsInput;
  existingGroupOwnerIds: string[];
}): AssignGroupsPlan {
  const groups = normalizeAssignPayload(input.incoming);
  const activeIds = new Set(groups.map((g) => g.id));
  const activeDocumentIds = groups.map((g) => documentIdForGroup(g.id));
  const orphanOwnerIds = input.existingGroupOwnerIds.filter((id) => !activeIds.has(id));
  return { groups, activeDocumentIds, orphanOwnerIds };
}

export function findGroupForUser(
  groups: DocumentGroupRecord[],
  userId: string,
): DocumentGroupRecord | null {
  return groups.find((g) => g.memberIds.includes(userId)) ?? null;
}

export function groupIdForUser(
  groups: DocumentGroupRecord[],
  userId: string,
): string | null {
  return findGroupForUser(groups, userId)?.id ?? null;
}

/** Document field id for this user in the current participation mode. */
export function documentIdForUserInRound(input: {
  participationMode: string;
  userId: string;
  groups: DocumentGroupRecord[];
}): string | null {
  if (input.participationMode === "individual") {
    return documentIdForStudent(input.userId);
  }
  if (input.participationMode === "group") {
    const groupId = groupIdForUser(input.groups, input.userId);
    return groupId ? documentIdForGroup(groupId) : null;
  }
  if (input.participationMode === "whole_class") {
    return documentIdForWholeClass();
  }
  return null;
}

export function isGroupMember(
  groups: DocumentGroupRecord[],
  groupId: string,
  userId: string,
): boolean {
  const g = groups.find((x) => x.id === groupId);
  return Boolean(g?.memberIds.includes(userId));
}

export function sessionGroupsToDocumentAssign(
  groups: SessionGroupRef[],
): AssignGroupsInput {
  return {
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      memberIds: [...g.memberIds],
      leaderId: g.leaderId,
    })),
  };
}

/** Client + server hint for whether this user may submit the bound document. */
export function canSubmitDocumentAsUser(input: {
  participationMode: string;
  userId: string;
  documentOwnerType: "student" | "group" | "class" | "teacher" | string;
  documentOwnerId: string;
  groups: DocumentGroupRecord[];
  groupSubmitPolicy: GroupSubmitPolicy;
  readyMemberIds: string[];
}): { ok: boolean; reason?: string } {
  if (input.documentOwnerType === "student") {
    if (input.documentOwnerId !== input.userId) {
      return { ok: false, reason: "You can only submit your own document." };
    }
    return { ok: true };
  }

  if (input.documentOwnerType === "group") {
    const group = input.groups.find((g) => g.id === input.documentOwnerId) ?? null;
    if (!group || !group.memberIds.includes(input.userId)) {
      return { ok: false, reason: "You are not in this group." };
    }
    if (
      !canGroupMemberSubmit({
        policy: input.groupSubmitPolicy,
        userId: input.userId,
        leaderId: group.leaderId,
        memberIds: group.memberIds,
        readyMemberIds: input.readyMemberIds,
      })
    ) {
      if (input.groupSubmitPolicy === "leader_only") {
        return { ok: false, reason: "Only the group leader can submit." };
      }
      if (input.groupSubmitPolicy === "everyone_ready") {
        return { ok: false, reason: "Everyone in the group must be Ready before submit." };
      }
      return { ok: false, reason: "You cannot submit yet." };
    }
    return { ok: true };
  }

  if (input.documentOwnerType === "class" || input.participationMode === "whole_class") {
    return {
      ok: false,
      reason: "Your teacher will collect the class document.",
    };
  }

  return { ok: false, reason: "This document cannot be submitted." };
}

/** True when Compare is allowed for this participation mode. */
export function canCompareInParticipationMode(participationMode: string): boolean {
  return participationMode === "individual" || participationMode === "group";
}

export type { GroupSubmitPolicy };
