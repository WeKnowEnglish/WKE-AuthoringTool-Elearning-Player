/**
 * Session groups adapter — activities consume VC groups; they do not own roster.
 */

export type SessionGroupRef = {
  id: string;
  name: string;
  memberIds: string[];
  leaderId: string | null;
};

export type GroupSubmitPolicy = "any_member" | "leader_only" | "everyone_ready";

export { canGroupMemberSubmit } from "@/lib/collaborative-activity/group-policy";

/** Map session groups into activity-local assignment payloads. */
export function sessionGroupsToAssignPayload(
  groups: SessionGroupRef[],
): { id: string; name: string; memberIds: string[] }[] {
  return groups
    .filter((g) => g.memberIds.length > 0)
    .map((g) => ({
      id: g.id,
      name: g.name,
      memberIds: [...g.memberIds],
    }));
}

export function documentIdForGroup(groupId: string): string {
  return `document:group:${groupId}`;
}

export function documentIdForStudent(studentId: string): string {
  return `document:student:${studentId}`;
}

export function documentIdForWholeClass(): string {
  return "document:whole-class";
}
