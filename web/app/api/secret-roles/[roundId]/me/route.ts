import { NextResponse } from "next/server";
import {
  requireSecretRoleMember,
  secretRoleAccessResponse,
} from "@/lib/secret-roles/server/access";
import { getSecretRoleStudentView } from "@/lib/secret-roles/server/persistence";

type RouteContext = { params: Promise<{ roundId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { roundId } = await context.params;
  try {
    const { member } = await requireSecretRoleMember(roundId);
    const view = await getSecretRoleStudentView(roundId, member.userId);
    if (!view) {
      return NextResponse.json(
        { error: "Your teacher has not assigned a role to you yet." },
        { status: 409 },
      );
    }
    return NextResponse.json(view, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return secretRoleAccessResponse(error);
  }
}
