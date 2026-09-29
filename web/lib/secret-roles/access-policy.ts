import type { SecretRoleRound } from "@/lib/secret-roles/domain";
import type { VirtualClassroomMemberToken } from "@/lib/virtual-classroom/session-cookie";

/** Pure identity check shared by the route adapter and authorization tests. */
export function canReadOwnSecretRole(
  round: Pick<SecretRoleRound, "sessionId">,
  member: VirtualClassroomMemberToken | null,
): member is VirtualClassroomMemberToken & { role: "member" } {
  return Boolean(
    member &&
      member.role === "member" &&
      member.sessionId === round.sessionId &&
      member.userId.trim(),
  );
}
