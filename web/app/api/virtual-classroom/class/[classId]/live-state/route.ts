import { NextResponse } from "next/server";
import { tickClassClock } from "@/lib/class-schedule/ensure-session";
import { getClassLiveState } from "@/lib/class-schedule/live-state";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";
import { requireWhiteboardStudent } from "@/lib/whiteboard/product/access";

type RouteContext = { params: Promise<{ classId: string }> };

/** Schedule + VC state. Teachers also safely advance the class clock; students only read. */
export async function GET(_request: Request, context: RouteContext) {
  const { classId } = await context.params;
  let teacherRequest = false;
  try {
    await requireWhiteboardTeacher(classId);
    teacherRequest = true;
  } catch {
    try {
      await requireWhiteboardStudent(classId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      return NextResponse.json({ error: message }, { status: 403 });
    }
  }

  // A teacher with the class hub open safely advances waiting/live even when
  // deployment cron is delayed or unavailable. Student reads remain read-only,
  // and tickClassClock respects teacher-dismissed occurrences.
  if (teacherRequest) {
    try {
      await tickClassClock(classId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not prepare the scheduled classroom.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const state = await getClassLiveState(classId);
  return NextResponse.json(state);
}
