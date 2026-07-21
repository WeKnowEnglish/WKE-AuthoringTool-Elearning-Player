/**
 * Group membership helpers for word cards (WC-6 orphan-and-lock).
 * Pure functions — safe for unit tests.
 */

import type { ActivityGroupSubmitPolicy } from "@/lib/collaborative-activity/domain";
import { canGroupMemberSubmit } from "@/lib/collaborative-activity/group-policy";
import { cardIdForGroup, cardIdForStudent } from "@/lib/word-cards/domain";

export type WordCardsGroupRecord = {
  id: string;
  name: string;
  memberIds: string[];
  leaderId: string | null;
};

export type AssignWordCardsGroupsInput = {
  groups: { id: string; name: string; memberIds: string[]; leaderId?: string | null }[];
};

export type AssignWordCardsGroupsPlan = {
  groups: WordCardsGroupRecord[];
  activeCardIds: string[];
  orphanOwnerIds: string[];
};

export function normalizeWordCardsAssignPayload(
  input: AssignWordCardsGroupsInput,
): WordCardsGroupRecord[] {
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

export function planAssignWordCardsGroups(input: {
  incoming: AssignWordCardsGroupsInput;
  existingGroupOwnerIds: string[];
}): AssignWordCardsGroupsPlan {
  const groups = normalizeWordCardsAssignPayload(input.incoming);
  const activeIds = new Set(groups.map((g) => g.id));
  const activeCardIds = groups.map((g) => cardIdForGroup(g.id));
  const orphanOwnerIds = input.existingGroupOwnerIds.filter((id) => !activeIds.has(id));
  return { groups, activeCardIds, orphanOwnerIds };
}

export function findWordCardsGroupForUser(
  groups: WordCardsGroupRecord[],
  userId: string,
): WordCardsGroupRecord | null {
  return groups.find((g) => g.memberIds.includes(userId)) ?? null;
}

export function cardIdForUserInRound(input: {
  participationMode: string;
  userId: string;
  groups: WordCardsGroupRecord[];
}): string | null {
  if (input.participationMode === "group") {
    const g = findWordCardsGroupForUser(input.groups, input.userId);
    return g ? cardIdForGroup(g.id) : null;
  }
  return cardIdForStudent(input.userId);
}

export function canSubmitWordCardAsUser(input: {
  participationMode: string;
  userId: string;
  cardOwnerType: string;
  cardOwnerId: string;
  groups: WordCardsGroupRecord[];
  policy: ActivityGroupSubmitPolicy;
  readyMemberIds: string[];
}): boolean {
  if (input.participationMode !== "group" || input.cardOwnerType !== "group") {
    return input.cardOwnerType === "student" && input.cardOwnerId === input.userId;
  }
  const group = input.groups.find((g) => g.id === input.cardOwnerId);
  if (!group) return false;
  return canGroupMemberSubmit({
    policy: input.policy,
    userId: input.userId,
    leaderId: group.leaderId,
    memberIds: group.memberIds,
    readyMemberIds: input.readyMemberIds,
  });
}

/** Extend review push: orphaned group cards are never pushable. */
export function canPushGroupCardForReview(input: {
  status: string | null | undefined;
  ownerType: string | null | undefined;
  ownerId: string | null | undefined;
  activeGroupIds?: string[];
}): boolean {
  if (input.ownerType === "teacher") return false;
  if (input.ownerType === "group") {
    const ownerId = input.ownerId ?? "";
    const active = input.activeGroupIds ?? [];
    if (active.length > 0 && !active.includes(ownerId)) return false;
  }
  const status = (input.status ?? "").toLowerCase();
  return (
    status === "submitted" ||
    status === "auto_submitted" ||
    status === "locked" ||
    status === "returned"
  );
}
