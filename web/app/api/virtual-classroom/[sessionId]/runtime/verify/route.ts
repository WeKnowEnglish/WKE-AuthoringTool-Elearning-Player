import { NextResponse } from "next/server";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import { verifyClassroomRuntimeSnapshot } from "@/lib/virtual-classroom/server/runtime-snapshot";

/** Read-only host diagnostic for the staged Supabase recovery cutover. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  try {
    await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Teacher authentication required." },
      { status: 403 },
    );
  }

  const result = await verifyClassroomRuntimeSnapshot({
    sessionId: session.id,
    roomId: session.liveblocksRoomId,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
