import { describe, expect, it } from "vitest";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import { resolveVirtualClassroomRuntimeReader } from "@/lib/virtual-classroom/server/runtime-access";
import { encodeVcMemberToken, formatVcHostCookie } from "@/lib/virtual-classroom/session-cookie";

const session: VirtualClassroomSessionRecord = {
  id: "vcs_ABC123",
  classId: "class-1",
  classLessonId: null,
  joinCode: "ABC123",
  liveblocksRoomId: "wke-vc-session-ABC123",
  title: "Class",
  status: "active",
  createdBy: "teacher-1",
  createdAt: "2026-08-09T00:00:00.000Z",
  endedAt: null,
  meetingSlotId: null,
  occurrenceStartsAt: null,
  occurrenceEndsAt: null,
  sessionKind: "extra",
  classPhase: "live",
};

describe("Virtual Classroom runtime snapshot access", () => {
  it("accepts a member cookie scoped to the requested session", () => {
    const memberCookie = encodeVcMemberToken({
      sessionId: session.id,
      joinCode: session.joinCode,
      roomId: session.liveblocksRoomId,
      userId: "student-1",
      displayName: "Mia",
      role: "member",
      expiresAt: Date.now() + 60_000,
    });

    expect(resolveVirtualClassroomRuntimeReader({ session, memberCookie, hostCookie: null }))
      .toEqual({ role: "member", userId: "student-1", displayName: "Mia" });
  });

  it("rejects a valid member token for a different session", () => {
    const memberCookie = encodeVcMemberToken({
      sessionId: "vcs_OTHER",
      joinCode: session.joinCode,
      roomId: session.liveblocksRoomId,
      userId: "student-1",
      displayName: "Mia",
      role: "member",
      expiresAt: Date.now() + 60_000,
    });

    expect(resolveVirtualClassroomRuntimeReader({ session, memberCookie, hostCookie: null })).toBeNull();
  });

  it("accepts the signed host cookie for the matching session", () => {
    expect(resolveVirtualClassroomRuntimeReader({
      session,
      memberCookie: null,
      hostCookie: formatVcHostCookie(session.joinCode, "host-secret"),
    })).toEqual({ role: "host", userId: null, displayName: null });
  });
});
