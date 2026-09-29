import { NextResponse } from "next/server";
import {
  requireSecretRoleMember,
  secretRoleAccessResponse,
} from "@/lib/secret-roles/server/access";
import { submitSecretRoleResponse } from "@/lib/secret-roles/server/persistence";

type RouteContext = { params: Promise<{ roundId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { roundId } = await context.params;
  try {
    const { member } = await requireSecretRoleMember(roundId);
    const body = (await request.json()) as { answer?: unknown; reasoning?: unknown };
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    const reasoning = typeof body.reasoning === "string" ? body.reasoning.trim() : "";
    if (!answer || !reasoning) {
      return NextResponse.json(
        { error: "Add both your conclusion and one reason." },
        { status: 400 },
      );
    }
    await submitSecretRoleResponse({ roundId, studentId: member.userId, answer, reasoning });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return secretRoleAccessResponse(error);
  }
}
