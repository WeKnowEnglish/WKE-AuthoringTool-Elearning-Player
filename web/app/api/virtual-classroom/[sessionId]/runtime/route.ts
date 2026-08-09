import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { resolveVirtualClassroomRuntimeReader } from "@/lib/virtual-classroom/server/runtime-access";
import { getClassroomRuntimeSnapshot } from "@/lib/virtual-classroom/server/runtime-snapshot";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

/**
 * Recovery-only endpoint for the versioned Supabase runtime snapshot.
 * It is not yet called by the classroom UI; Liveblocks remains the live
 * transport until the channel migration is complete.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  const cookieStore = await cookies();
  const reader = resolveVirtualClassroomRuntimeReader({
    session,
    hostCookie: cookieStore.get(VC_HOST_COOKIE)?.value,
    memberCookie: cookieStore.get(VC_MEMBER_COOKIE)?.value,
  });
  if (!reader) return NextResponse.json({ error: "Not authorized for this classroom." }, { status: 403 });

  const snapshot = await getClassroomRuntimeSnapshot(session.id);
  if (!snapshot) {
    return NextResponse.json(
      { error: "Classroom runtime snapshot is not available yet." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { snapshot, role: reader.role },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
