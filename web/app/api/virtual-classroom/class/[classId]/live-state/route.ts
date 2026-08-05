import { NextResponse } from "next/server";
import { getClassLiveState } from "@/lib/class-schedule/live-state";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";
import { requireWhiteboardStudent } from "@/lib/whiteboard/product/access";

type RouteContext = { params: Promise<{ classId: string }> };

/** Read-only schedule + VC state (auth: enrolled student or owning teacher). */
export async function GET(_request: Request, context: RouteContext) {
  const { classId } = await context.params;
  try {
    await requireWhiteboardTeacher(classId);
  } catch {
    try {
      await requireWhiteboardStudent(classId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      return NextResponse.json({ error: message }, { status: 403 });
    }
  }

  const state = await getClassLiveState(classId);
  return NextResponse.json(state);
}
