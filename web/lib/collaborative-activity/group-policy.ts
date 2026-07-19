import type { ActivityGroupSubmitPolicy } from "@/lib/collaborative-activity/domain";

export function canGroupMemberSubmit(input: {
  policy: ActivityGroupSubmitPolicy;
  userId: string;
  leaderId: string | null;
  memberIds: string[];
  readyMemberIds: string[];
}): boolean {
  if (!input.memberIds.includes(input.userId)) return false;
  if (input.policy === "any_member") return true;
  if (input.policy === "leader_only") {
    return input.leaderId != null && input.leaderId === input.userId;
  }
  return input.memberIds.every((id) => input.readyMemberIds.includes(id));
}
