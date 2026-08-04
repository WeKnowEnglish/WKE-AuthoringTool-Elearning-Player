import { NextResponse } from "next/server";
import { withCollabServerTiming } from "@/lib/collab-diagnostics/server-timing";
import { getReadyClassLessonForClass } from "@/lib/data/class-lessons";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";
import { bootstrapVirtualClassroomHost } from "@/lib/virtual-classroom/server/host-bootstrap";
import {
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";

type RouteContext = { params: Promise<{ classId: string }> };

type Body = { title?: string; classLessonId?: string | null };

/** Class-linked host (same as POST /api/virtual-classroom/host with classId). */
export async function POST(request: Request, context: RouteContext) {
  return withCollabServerTiming("vc.class_host", async (timer) => {
    const { classId } = await context.params;
    timer.setContext({
      activity: "classroom",
      role: "host",
      commandType: "CLASS_HOST",
      classId,
    });

    let teacher: { userId: string; displayName: string };
    try {
      teacher = await timer.measure("auth", () => requireWhiteboardTeacher(classId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    let body: Body = {};
    try {
      body = await timer.measure("parseBody", () => request.json() as Promise<Body>);
    } catch {
      body = {};
    }

    let classLessonId: string | null = null;
    const requestedLessonId =
      typeof body.classLessonId === "string" ? body.classLessonId.trim() : "";
    if (requestedLessonId) {
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
        oneOff: false,
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
