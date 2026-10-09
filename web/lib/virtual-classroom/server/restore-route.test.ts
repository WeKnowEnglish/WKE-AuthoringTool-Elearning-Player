import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/virtual-classroom/[sessionId]/restore/route";
const mocks = vi.hoisted(() => ({ session: vi.fn(), host: vi.fn(), student: vi.fn(), reader: vi.fn(), ensureHost: vi.fn(), ensureMember: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/virtual-classroom/server/session", () => ({ getVirtualClassroomSessionById: mocks.session }));
vi.mock("@/lib/virtual-classroom/server/access", () => ({ requireVirtualClassroomSessionHost: mocks.host }));
vi.mock("@/lib/whiteboard/product/access", () => ({ requireWhiteboardStudent: mocks.student }));
vi.mock("@/lib/virtual-classroom/server/runtime-access", () => ({ authorizeVirtualClassroomRuntimeReader: mocks.reader }));
vi.mock("@/lib/virtual-classroom/server/host-bootstrap", () => ({ ensureVirtualClassroomHostRoom: mocks.ensureHost }));
vi.mock("@/lib/virtual-classroom/server/liveblocks-session", () => ({ ensureVcMember: mocks.ensureMember }));
vi.mock("@/lib/classroom-realtime/shadow-mode", () => ({ classroomRealtimeNativeShellAuthorityReady: () => false, classroomRealtimeNativeShellPilotEnabled: () => false }));
vi.mock("@/lib/virtual-classroom/server/runtime-snapshot", () => ({ getClassroomRuntimeSnapshot: vi.fn() }));
const session = { id: "vcs_TEST01", joinCode: "TEST01", liveblocksRoomId: "wke-vc-session-TEST01", classId: "class-a", classPhase: "live", title: "Class", status: "active", endedAt: null };
const restore = () => POST(new Request("https://preview.example/api/virtual-classroom/vcs_TEST01/restore", { method: "POST", body: JSON.stringify({ userId: "forged", role: "host" }) }), { params: Promise.resolve({ sessionId: session.id }) });
beforeEach(() => {
  vi.resetAllMocks(); process.env.VIRTUAL_CLASSROOM_COOKIE_SECRET = "restore-test-secret";
  mocks.session.mockResolvedValue(session);
  mocks.host.mockRejectedValue(new Error("Not host"));
  mocks.student.mockResolvedValue({ userId: "student-a", displayName: "Mia" });
  mocks.reader.mockResolvedValue(null);
});
describe("classroom restore endpoint", () => {
  it("recovers an enrolled account without local context and never trusts a supplied identity", async () => {
    const response = await restore();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ sessionId: session.id, role: "member", userId: "student-a" });
    expect(response.cookies.get("wke-vc-host")).toBeUndefined();
    expect(mocks.ensureHost).not.toHaveBeenCalled();
  });
  it("keeps teacher ownership and host restoration", async () => {
    mocks.host.mockResolvedValue({ userId: "teacher-a", displayName: "Teacher" });
    const response = await restore();
    expect(await response.json()).toMatchObject({ role: "host", userId: "teacher-a" });
    expect(mocks.ensureHost).toHaveBeenCalledOnce(); expect(mocks.student).not.toHaveBeenCalled();
  });
  it("denies accounts that are no longer enrolled", async () => {
    mocks.student.mockRejectedValue(new Error("Not enrolled"));
    expect((await restore()).status).toBe(403); expect(mocks.ensureMember).not.toHaveBeenCalled();
  });
  it.each([{ status: "ended" }, { endedAt: "2026-10-10" }])("never restores an ended lesson %j", async state => {
    mocks.session.mockResolvedValue({ ...session, ...state });
    expect((await restore()).status).toBe(410); expect(mocks.host).not.toHaveBeenCalled();
  });
  it("keeps prep private and sends waiting students to the waiting room", async () => {
    mocks.session.mockResolvedValue({ ...session, classPhase: "prep" });
    expect((await restore()).status).toBe(403);
    mocks.session.mockResolvedValue({ ...session, classPhase: "waiting" });
    expect(await (await restore()).json()).toMatchObject({ landing: "waiting" });
  });
  it("requires original verified membership for one-off guests", async () => {
    mocks.session.mockResolvedValue({ ...session, classId: null });
    expect((await restore()).status).toBe(403);
    mocks.reader.mockResolvedValue({ role: "member", userId: "guest-original", displayName: "Guest" });
    expect(await (await restore()).json()).toMatchObject({ userId: "guest-original", role: "member" });
  });
  it("makes temporary provider failure retryable without claiming recovery", async () => {
    mocks.ensureMember.mockRejectedValue(new Error("Temporarily unavailable"));
    expect((await restore()).status).toBe(503);
  });
});
