import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/virtual-classroom/[sessionId]/document/route";

const mocks = vi.hoisted(() => ({ session: vi.fn(), host: vi.fn(), launch: vi.fn(), round: vi.fn(), command: vi.fn() }));
vi.mock("@/lib/virtual-classroom/server/access", () => ({ requireVirtualClassroomSessionHost: mocks.host }));
vi.mock("@/lib/virtual-classroom/server/session", () => ({ getVirtualClassroomSessionById: mocks.session }));
vi.mock("@/lib/document-activity/server/launch", () => ({ launchDocumentRound: mocks.launch }));
vi.mock("@/lib/document-activity/server/persistence", () => ({ getDocumentRoundById: mocks.round }));
vi.mock("@/lib/document-activity/server/commands", () => ({ applyDocumentTeacherCommand: mocks.command }));
const call = (body: unknown) => POST(new Request("https://preview.example/api/virtual-classroom/session/document", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}), { params: Promise.resolve({ sessionId: "session" }) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ id: "session", classId: "class", status: "active" });
  mocks.host.mockResolvedValue({ userId: "teacher", displayName: "Teacher" });
  mocks.launch.mockResolvedValue({ roundId: "round", roomId: "room", vcSessionId: "session", participationMode: "whole_class" });
  mocks.round.mockResolvedValue({ phase: "waiting" });
  mocks.command.mockResolvedValue({ phase: "active" });
});
describe("simple shared document launch", () => {
  it("opens the new round immediately with the current teacher identity", async () => {
    const result = await call({ participationMode: "whole_class", startOpen: true });
    expect(result.status).toBe(200);
    expect(mocks.command).toHaveBeenCalledWith({ roomId: "room", roundId: "round", sessionId: "session", hostUserId: "teacher", command: { type: "OPEN" } });
  });
  it.each(["active", "collected", "revision"])("retries a %s round without resetting existing writing", async phase => {
    mocks.round.mockResolvedValue({ phase });
    expect((await call({ startOpen: true })).status).toBe(200);
    expect(mocks.command).toHaveBeenCalledWith(expect.objectContaining({ command: { type: "SYNC_STATE" } }));
  });
  it("keeps the existing staged launch available", async () => {
    expect((await call({ participationMode: "individual" })).status).toBe(200);
    expect(mocks.command).not.toHaveBeenCalled();
  });
  it("rejects students before creating a provider room", async () => {
    mocks.host.mockRejectedValue(new Error("Host only"));
    expect((await call({ startOpen: true })).status).toBe(403);
    expect(mocks.launch).not.toHaveBeenCalled();
  });
  it("reports an opening failure instead of claiming the document is ready", async () => {
    mocks.command.mockRejectedValue(new Error("Could not save round"));
    const result = await call({ startOpen: true });
    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ error: "Could not save round" });
  });
});
