import { NextResponse } from "next/server";
import {
  requireSecretRoleMember,
  secretRoleAccessResponse,
} from "@/lib/secret-roles/server/access";
import { markSecretRoleReady } from "@/lib/secret-roles/server/persistence";

type RouteContext = { params: Promise<{ roundId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { roundId } = await context.params;
  try {
    const { member } = await requireSecretRoleMember(roundId);
    await markSecretRoleReady(roundId, member.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return secretRoleAccessResponse(error);
  }
}
