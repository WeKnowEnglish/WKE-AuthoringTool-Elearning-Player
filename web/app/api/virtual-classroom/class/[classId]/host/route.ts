import { NextResponse } from "next/server";
import { withCollabServerTiming } from "@/lib/collab-diagnostics/server-timing";
import { ensureClassSessionForClock } from "@/lib/class-schedule/ensure-session";
import { getReadyClassLessonForClass } from "@/lib/data/class-lessons";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";
import { mintHostCookiesForSession } from "@/lib/virtual-classroom/server/mint-host-cookies";
import {
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";

type RouteContext = { params: Promise<{ classId: string }> };

type Body = {
  title?: string;
  classLessonId?: string | null;
  /** auto = clock; early = teacher prep; live = start now; extra = unscheduled */
  mode?: "auto" | "early" | "live" | "extra";
};

/** Class-linked host / early-open / start-now / extra session. */
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
    const mode = body.mode ?? "live";

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
      const ensured = await timer.measure("bootstrap", () =>
        ensureClassSessionForClock({
          classId,
          mode,
          classLessonId,
          title: body.title,
          teacher,
        }),
      );
      if (!ensured.session) {
        return NextResponse.json(
          { error: "No class session available yet for this schedule window." },
          { status: 409 },
        );
      }

      const cookies = await mintHostCookiesForSession({
        session: ensured.session,
        teacher,
      });
      timer.setContext({
        sessionId: ensured.session.id,
        roomId: ensured.session.liveblocksRoomId,
      });

      const response = NextResponse.json({
        sessionId: ensured.session.id,
        joinCode: ensured.session.joinCode,
        roomId: ensured.session.liveblocksRoomId,
        classId: ensured.session.classId,
        classLessonId: ensured.session.classLessonId,
        title: ensured.session.title,
        userId: teacher.userId,
        displayName: teacher.displayName,
        role: "host" as const,
        oneOff: false,
        sessionKind: ensured.session.sessionKind,
        classPhase: ensured.session.classPhase,
        created: ensured.created,
        promoted: ensured.promoted,
      });

      const cookieOpts = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      };
      response.cookies.set(VC_HOST_COOKIE, cookies.hostCookie, cookieOpts);
      response.cookies.set(VC_MEMBER_COOKIE, cookies.memberToken, cookieOpts);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start session.";
      const status = message.includes("Too early") ? 403 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
