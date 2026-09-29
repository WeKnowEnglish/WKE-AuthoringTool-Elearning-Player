import "server-only";

import { cookies } from "next/headers";
import { canReadOwnSecretRole } from "@/lib/secret-roles/access-policy";
import { getSecretRoleRound } from "@/lib/secret-roles/server/persistence";
import {
  decodeVcMemberToken,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

export class SecretRoleAccessError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function requireSecretRoleMember(roundId: string) {
  const cookieStore = await cookies();
  const member = decodeVcMemberToken(cookieStore.get(VC_MEMBER_COOKIE)?.value);
  if (!member || member.role !== "member") {
    throw new SecretRoleAccessError("Join this classroom before opening your role.", 403);
  }
  const round = await getSecretRoleRound(roundId);
  if (!round) throw new SecretRoleAccessError("Round not found.", 404);
  if (!canReadOwnSecretRole(round, member)) {
    throw new SecretRoleAccessError("Join this classroom before opening your role.", 403);
  }
  return { round, member };
}

export async function requireSecretRoleHost(roundId: string) {
  const round = await getSecretRoleRound(roundId);
  if (!round) throw new SecretRoleAccessError("Round not found.", 404);
  const session = await getVirtualClassroomSessionById(round.sessionId);
  if (!session) throw new SecretRoleAccessError("Classroom not found.", 404);
  try {
    const teacher = await requireVirtualClassroomSessionHost(session);
    return { round, session, teacher };
  } catch (error) {
    throw new SecretRoleAccessError(
      error instanceof Error ? error.message : "Host access required.",
      403,
    );
  }
}

export function secretRoleAccessResponse(error: unknown): Response {
  const status = error instanceof SecretRoleAccessError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Secret Roles request failed.";
  return Response.json({ error: message }, { status });
}
