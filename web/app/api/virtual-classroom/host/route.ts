import { NextResponse } from "next/server";
import { isTeacher } from "@/lib/auth/roles";
import { withCollabServerTiming } from "@/lib/collab-diagnostics/server-timing";
import { getReadyClassLessonForClass } from "@/lib/data/class-lessons";
import { createClient } from "@/lib/supabase/server";
import {
  requireVirtualClassroomTeacher,
} from "@/lib/virtual-classroom/server/access";
import { bootstrapVirtualClassroomHost } from "@/lib/virtual-classroom/server/host-bootstrap";
import {
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";

type Body = {
  title?: string;
  /** Omit or null for a one-off session (guest students allowed). */
  classId?: string | null;
  classLessonId?: string | null;
};

/**
 * Teacher-only host. Optional classId:
 * - with classId → enrolled students join
 * - without → one-off; anyone with the code can join as a guest
 */
export async function POST(request: Request) {
  return withCollabServerTiming("vc.host", async (timer) => {
    timer.setContext({ activity: "classroom", role: "host", commandType: "HOST" });

    let body: Body = {};
    try {
      body = await timer.measure("parseBody", () => request.json() as Promise<Body>);
    } catch {
      body = {};
    }

    const classId =
      typeof body.classId === "string" && body.classId.trim()
        ? body.classId.trim()
        : null;
    timer.setContext({ classId });

    let teacher: { userId: string; displayName: string };
    try {
      teacher = await timer.measure("auth", async () => {
        if (classId) {
          return requireWhiteboardTeacher(classId);
        }
        return requireVirtualClassroomTeacher();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      const status = message.includes("login") ? 401 : 403;
      return NextResponse.json({ error: message }, { status });
    }

    // Belt-and-suspenders: never host as non-teacher
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isTeacher(user)) {
      return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
    }

    let classLessonId: string | null = null;
    const requestedLessonId =
      typeof body.classLessonId === "string" ? body.classLessonId.trim() : "";
    if (requestedLessonId) {
      if (!classId) {
        return NextResponse.json(
          { error: "Lessons can only be bound to a class session." },
          { status: 400 },
        );
      }
      const lesson = await timer.measure("validateLesson", () =>
        getReadyClassLessonForClass({ lessonId: requestedLessonId, classId }),
      );
      if (!lesson) {
        return NextResponse.json(
          { error: "Select a Ready lesson with at least one step." },
          { status: 400 },
        );
      }
      classLessonId = lesson.id;
    }

    try {
      const hosted = await timer.measure("bootstrap", () =>
        bootstrapVirtualClassroomHost({
          teacher,
          classId,
          classLessonId,
          title: body.title,
        }),
      );
      timer.setContext({ sessionId: hosted.sessionId, roomId: hosted.roomId });

      const response = NextResponse.json({
        sessionId: hosted.sessionId,
        joinCode: hosted.joinCode,
        roomId: hosted.roomId,
        classId: hosted.classId,
        classLessonId: hosted.classLessonId,
        title: hosted.title,
        userId: hosted.userId,
        displayName: hosted.displayName,
        role: hosted.role,
        oneOff: hosted.classId == null,
        dailyRoomUrl: hosted.dailyRoomUrl,
      });

      const cookieOpts = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      };
      response.cookies.set(VC_HOST_COOKIE, hosted.hostCookie, cookieOpts);
      response.cookies.set(VC_MEMBER_COOKIE, hosted.memberToken, cookieOpts);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start session.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
