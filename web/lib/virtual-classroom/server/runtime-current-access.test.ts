import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import { authorizeVirtualClassroomRuntimeReader } from "./runtime-access";
import { encodeVcMemberToken, formatVcHostCookie } from "@/lib/virtual-classroom/session-cookie";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, from: mocks.from }) }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleSupabase: () => ({ from: mocks.from }) }));
const session: VirtualClassroomSessionRecord = {
  id: "vcs_AB34CD", classId: "class-a", classLessonId: null, joinCode: "AB34CD",
  liveblocksRoomId: "wke-vc-session-AB34CD", title: "Class", status: "active",
  createdBy: "teacher-a", createdAt: "2026-10-06", endedAt: null,
  meetingSlotId: null, occurrenceStartsAt: null, occurrenceEndsAt: null,
  sessionKind: "extra", classPhase: "live",
};
let rows: Record<string, Record<string, unknown> | null>;
function user(id: string, role = "teacher", status = "approved", tier = "plus") {
  mocks.auth.mockResolvedValue({ data: { user: { id, app_metadata: { role, teacher_tier: tier, teacher_access_status: status }, user_metadata: { display_name: "Current name" } } }, error: null });
}
function member(userId: string, role: "host" | "member" = "member") {
  return encodeVcMemberToken({ sessionId: session.id, joinCode: session.joinCode, roomId: session.liveblocksRoomId, userId, displayName: "Old cookie name", role });
}
function authorize(memberCookie: string | null, hostCookie: string | null = null, overrides = {}) {
  return authorizeVirtualClassroomRuntimeReader({ session: { ...session, ...overrides }, memberCookie, hostCookie });
}
beforeEach(() => {
  vi.clearAllMocks(); user("teacher-a");
  rows = {
    teacher_classes: { id: "class-a", teacher_id: "teacher-a", archived_at: null },
    class_enrollments: { student_id: "student-a" },
    student_profiles: { display_name: "Mia" },
  };
  mocks.from.mockImplementation((table: string) => {
    const q = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    q.select.mockReturnValue(q); q.eq.mockReturnValue(q);
    q.maybeSingle.mockImplementation(async () => ({ data: rows[table], error: null }));
    return q;
  });
});

describe("Virtual Classroom current membership", () => {
  it("sets host identity from the current owning account even with only a host cookie", async () => {
    expect(await authorize(null, formatVcHostCookie(session.joinCode, "secret")))
      .toEqual({ role: "host", userId: "teacher-a", displayName: "Current name" });
  });
  it.each(["pending", "suspended"])("denies a %s teacher's signed cookies", async (status) => {
    user("teacher-a", "teacher", status);
    expect(await authorize(member("teacher-a", "host"), formatVcHostCookie(session.joinCode, "secret"))).toBeNull();
  });
  it("denies a Light downgrade while old host cookies are valid", async () => {
    user("teacher-a", "teacher", "approved", "light");
    expect(await authorize(member("teacher-a", "host"))).toBeNull();
  });
  it("denies teacher B holding teacher A's signed host cookie", async () => {
    user("teacher-b");
    expect(await authorize(null, formatVcHostCookie(session.joinCode, "secret"))).toBeNull();
  });
  it("denies an ended classroom before accessing Auth or student data", async () => {
    expect(await authorize(member("teacher-a", "host"), null, { status: "ended" })).toBeNull();
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("allows an enrolled student's matching token and current name", async () => {
    user("student-a", "student");
    expect(await authorize(member("student-a"))).toEqual({ role: "member", userId: "student-a", displayName: "Mia" });
  });
  it("denies a removed student and an archived class", async () => {
    user("student-a", "student"); rows.class_enrollments = null;
    expect(await authorize(member("student-a"))).toBeNull();
    rows.class_enrollments = { student_id: "student-a" };
    rows.teacher_classes = { id: "class-a", teacher_id: "teacher-a", archived_at: "2026-10-06" };
    expect(await authorize(member("student-a"))).toBeNull();
  });
  it("denies a student using another student's genuine cookie", async () => {
    user("student-b", "student");
    expect(await authorize(member("student-a"))).toBeNull();
  });
  it("allows anonymous one-off guests issued by the join endpoint", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });
    expect(await authorize(member("guest-server-generated"), null, { classId: null })).toMatchObject({ role: "member" });
    expect(await authorize(member("student-a"), null, { classId: null })).toBeNull();
  });
  it("denies a suspended teacher's one-off member cookie", async () => {
    user("teacher-a", "teacher", "suspended");
    expect(await authorize(member("teacher-a"), null, { classId: null })).toBeNull();
  });
  it("checks the creating teacher for one-off host access", async () => {
    expect(await authorize(member("teacher-a", "host"), null, { classId: null })).toMatchObject({ role: "host" });
    user("teacher-b");
    expect(await authorize(member("teacher-a", "host"), null, { classId: null })).toBeNull();
  });
});
