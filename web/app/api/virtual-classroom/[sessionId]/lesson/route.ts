import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getClassLesson,
  getReadyClassLessonForClass,
} from "@/lib/data/class-lessons";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import {
  getVirtualClassroomSessionById,
  setVirtualClassroomSessionLesson,
} from "@/lib/virtual-classroom/server/session";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Host (or authorized member) reads the staged lesson bound to this session. */
export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const member = decodeVcMemberToken(cookieStore.get(VC_MEMBER_COOKIE)?.value);
  const hostOk = vcHostMatchesJoinCode(
    cookieStore.get(VC_HOST_COOKIE)?.value,
    session.joinCode,
  );
  if (!hostOk && member?.sessionId !== session.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (!session.classLessonId) {
    return NextResponse.json({
      classLessonId: null,
      lesson: null,
    });
  }

  try {
    const lesson = await getClassLesson(session.classLessonId);
    return NextResponse.json({
      classLessonId: session.classLessonId,
      lesson,
    });
  } catch {
    // Members are not teachers — fall through with null lesson body for students.
    return NextResponse.json({
      classLessonId: session.classLessonId,
      lesson: null,
    });
  }
}

type BindBody = { classLessonId?: string | null };

/** Host binds (or clears) a Ready lesson on an active class session. */
export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session has ended." }, { status: 410 });
  }
  if (!session.classId) {
    return NextResponse.json(
      { error: "Lessons can only be bound to a class session." },
      { status: 400 },
    );
  }

  try {
    await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  let body: BindBody = {};
  try {
    body = (await request.json()) as BindBody;
  } catch {
    body = {};
  }

  const requested =
    typeof body.classLessonId === "string" ? body.classLessonId.trim() : "";
  let classLessonId: string | null = null;
  if (requested) {
    const lesson = await getReadyClassLessonForClass({
      lessonId: requested,
      classId: session.classId,
    });
    if (!lesson) {
      return NextResponse.json(
        { error: "Select a Ready lesson with at least one step." },
        { status: 400 },
      );
    }
    classLessonId = lesson.id;
  }

  const updated = await setVirtualClassroomSessionLesson({
    sessionId: session.id,
    classLessonId,
  });
  if (!updated) {
    return NextResponse.json({ error: "Could not update lesson." }, { status: 500 });
  }

  const lesson = classLessonId ? await getClassLesson(classLessonId) : null;
  return NextResponse.json({
    classLessonId: updated.classLessonId,
    lesson,
  });
}
