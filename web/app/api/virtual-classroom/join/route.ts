import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isValidJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { withCollabServerTiming } from "@/lib/collab-diagnostics/server-timing";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { createClient } from "@/lib/supabase/server";
import {
  encodeVcMemberToken,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { ensureVcMember } from "@/lib/virtual-classroom/server/liveblocks-session";
import { getVirtualClassroomSessionByJoinCode } from "@/lib/virtual-classroom/server/session";
import { requireWhiteboardStudent } from "@/lib/whiteboard/product/access";
import {
  classroomRealtimeNativeShellAuthorityReady,
  classroomRealtimeNativeShellPilotEnabled,
} from "@/lib/classroom-realtime/shadow-mode";
import { getClassroomRuntimeSnapshot } from "@/lib/virtual-classroom/server/runtime-snapshot";

type Body = {
  joinCode?: string;
  /** Required for one-off / guest joins. */
  displayName?: string;
};

export async function POST(request: Request) {
  return withCollabServerTiming("vc.join", async (timer) => {
    timer.setContext({ activity: "classroom", role: "member", commandType: "JOIN" });

    let body: Body = {};
    try {
      body = await timer.measure("parseBody", () => request.json() as Promise<Body>);
    } catch {
      body = {};
    }

    const joinCode = body.joinCode?.trim().toUpperCase() ?? "";
    if (!isValidJoinCode(joinCode)) {
      return NextResponse.json({ error: "Invalid join code." }, { status: 400 });
    }

    const session = await timer.measure("loadSession", () =>
      getVirtualClassroomSessionByJoinCode(joinCode),
    );
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (session.status !== "active") {
      return NextResponse.json(
        { error: "This Virtual Classroom session has ended." },
        { status: 410 },
      );
    }
    // Students may enter waiting or live; prep is teacher-only.
    if (
      session.classId &&
      session.classPhase === "prep"
    ) {
      return NextResponse.json(
        { error: "Class is not open for students yet. Waiting room opens 15 minutes before start." },
        { status: 403 },
      );
    }
    if (
      session.classId &&
      session.classPhase !== "waiting" &&
      session.classPhase !== "live"
    ) {
      return NextResponse.json(
        { error: "This class session is not open to join yet." },
        { status: 403 },
      );
    }
    timer.setContext({
      sessionId: session.id,
      roomId: session.liveblocksRoomId,
      classId: session.classId,
    });
    const nativeSupabaseShell =
      Boolean(session.classId) &&
      classroomRealtimeNativeShellPilotEnabled() &&
      classroomRealtimeNativeShellAuthorityReady() &&
      Boolean(await getClassroomRuntimeSnapshot(session.id));
    if (!nativeSupabaseShell) {
      try {
        assertLiveblocksSecret();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Liveblocks is not configured.";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    let userId: string;
    let displayName: string;

    try {
      const identity = await timer.measure("auth", async () => {
        if (session.classId) {
          const student = await requireWhiteboardStudent(session.classId);
          return { userId: student.userId, displayName: student.displayName };
        }
        // One-off: guests allowed (optionally signed-in).
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const guestName = body.displayName?.trim().slice(0, 40);
        if (user?.id) {
          return {
            userId: user.id,
            displayName:
              guestName ||
              (user.user_metadata?.display_name as string | undefined)?.trim() ||
              user.email?.split("@")[0] ||
              "Student",
          };
        }
        if (!guestName || guestName.length < 2) {
          throw new Error("Enter a display name to join this one-off session.");
        }
        return {
          userId: `guest-${randomBytes(16).toString("hex")}`,
          displayName: guestName,
        };
      });
      userId = identity.userId;
      displayName = identity.displayName;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      const status = message.includes("display name") ? 400 : 403;
      return NextResponse.json({ error: message }, { status });
    }

    try {
      if (!nativeSupabaseShell) {
        await timer.measure("ensureMember", () =>
          ensureVcMember({
            roomId: session.liveblocksRoomId,
            userId,
            displayName,
            role: "member",
          }),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not join session.";
      return NextResponse.json({ error: message }, { status: 404 });
    }

    const memberToken = encodeVcMemberToken({
      sessionId: session.id,
      joinCode: session.joinCode,
      roomId: session.liveblocksRoomId,
      userId,
      displayName,
      role: "member",
    });

    const response = NextResponse.json({
      sessionId: session.id,
      joinCode: session.joinCode,
      roomId: session.liveblocksRoomId,
      classId: session.classId,
      title: session.title,
      userId,
      displayName,
      role: "member" as const,
      oneOff: session.classId == null,
      classPhase: session.classPhase,
      sessionKind: session.sessionKind,
      landing:
        session.classPhase === "waiting" ? ("waiting" as const) : ("live" as const),
    });

    response.cookies.set(VC_MEMBER_COOKIE, memberToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  });
}
