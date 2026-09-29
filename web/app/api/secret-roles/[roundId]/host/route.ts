import { NextResponse } from "next/server";
import {
  requireSecretRoleHost,
  secretRoleAccessResponse,
} from "@/lib/secret-roles/server/access";
import { getSecretRoleHostView } from "@/lib/secret-roles/server/persistence";

type RouteContext = { params: Promise<{ roundId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { roundId } = await context.params;
  try {
    await requireSecretRoleHost(roundId);
    const view = await getSecretRoleHostView(roundId);
    if (!view) return NextResponse.json({ error: "Round not found." }, { status: 404 });
    return NextResponse.json(view, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return secretRoleAccessResponse(error);
  }
}
