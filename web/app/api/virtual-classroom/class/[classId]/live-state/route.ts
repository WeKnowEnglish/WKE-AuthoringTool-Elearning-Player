import { NextResponse } from "next/server";
import { getClassLiveState } from "@/lib/class-schedule/live-state";
import { ensureClassSessionForClock } from "@/lib/class-schedule/ensure-session";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";
import { requireWhiteboardStudent } from "@/lib/whiteboard/product/access";

type RouteContext = { params: Promise<{ classId: string }> };

/** Public-ish live state for a class (auth: enrolled student or owning teacher). */
export async function GET(_request: Request, context: RouteContext) {
  const { classId } = await context.params;
  try {
    await requireWhiteboardStudent(classId);
  } catch {
    try {
      await requireWhiteboardTeacher(classId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      return NextResponse.json({ error: message }, { status: 403 });
    }
  }

  // Lazy clock tick so waiting/live sessions appear without waiting for cron.
  await ensureClassSessionForClock({ classId, mode: "auto" }).catch(() => undefined);
  const state = await getClassLiveState(classId);
  return NextResponse.json(state);
}
