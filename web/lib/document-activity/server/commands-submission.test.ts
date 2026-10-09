import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyDocumentStudentCommand, applyDocumentTeacherCommand } from "./commands";

const mocks = vi.hoisted(() => ({ save: vi.fn(), meta: vi.fn(), yjs: vi.fn(), mutate: vi.fn(), broadcast: vi.fn() }));
vi.mock("@/lib/document-activity/server/submissions", () => ({ persistDocumentSubmission: mocks.save }));
vi.mock("@/lib/document-activity/server/persistence", () => ({ upsertDocumentRoundMeta: mocks.meta }));
vi.mock("@/lib/document-activity/server/yjs-content", () => ({ readDocumentYjsContent: mocks.yjs }));
vi.mock("@/lib/live-game/server/liveblocks-client", () => ({
  getLiveblocksServerClient: () => ({ mutateStorage: mocks.mutate, broadcastEvent: mocks.broadcast }),
}));

class Node {
  constructor(public data: Record<string, unknown>) {}
  get(key: string) { return this.data[key]; }
  set(key: string, value: unknown) { this.data[key] = value; }
}
let runtime: Node;
let documents: Map<string, Node>;
let participants: Map<string, Node>;
let groups: Map<string, Node>;
const docId = "document:student:student-a";
function addDocument(id = docId, ownerId = "student-a") {
  const doc = new Node({ id, ownerType: "student", ownerId, revision: 1, status: "active", submittedAt: null });
  documents.set(id, doc); return doc;
}
const student = (content = "Original work") => applyDocumentStudentCommand({
  roomId: "room-a", roundId: "round-a", userId: "student-a",
  command: { type: "SUBMIT", documentId: docId, contentJson: { text: content }, plainText: content, wordCount: 999 },
});
const collect = () => applyDocumentTeacherCommand({ roomId: "room-a", roundId: "round-a", sessionId: "session-a", hostUserId: "teacher-a", command: { type: "COLLECT" } });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DOCUMENT_SUBMISSION_SECRET", "document-recovery-test-secret");
  runtime = new Node({ phase: "active", participationMode: "individual", templateType: "paragraph", settings: { groupSubmitPolicy: "any_member" }, review: null });
  documents = new Map(); participants = new Map(); groups = new Map();
  participants.set("student-a", new Node({ role: "player", ready: true }));
  addDocument();
  const root = new Node({ runtime, documents, participants, groups });
  mocks.mutate.mockImplementation(async (_room, callback) => callback({ root }));
  mocks.save.mockResolvedValue(undefined); mocks.meta.mockResolvedValue(undefined); mocks.broadcast.mockResolvedValue(undefined);
  mocks.yjs.mockResolvedValue({ contentJson: { text: "Collected work" }, plainText: "Collected work", wordCount: 2 });
});
afterEach(() => vi.unstubAllEnvs());

describe("teacher document state-save recovery", () => {
  const teacher = (type: "OPEN" | "SYNC_STATE" | "COMPLETE" | "REVISE", deferCompletionConfirmation = false) =>
    applyDocumentTeacherCommand({ roomId: "room-a", roundId: "round-a", sessionId: "session-a", hostUserId: "teacher-a", command: { type }, deferCompletionConfirmation });
  it("surfaces a failed Open and retries the original phase/time without reopening", async () => {
    runtime.set("phase", "waiting"); mocks.meta.mockRejectedValueOnce(new Error("Metadata unavailable"));
    await expect(teacher("OPEN")).rejects.toThrow("Metadata unavailable");
    const openedAt = runtime.get("openedAt");
    expect(runtime.get("phase")).toBe("active"); expect(runtime.get("roundSavePending")).toBe(true);
    expect(mocks.broadcast).not.toHaveBeenCalled();
    await expect(teacher("COMPLETE")).rejects.toThrow("Retry saving activity state");
    expect(await teacher("SYNC_STATE")).toEqual({ phase: "active" });
    expect(runtime.get("openedAt")).toBe(openedAt); expect(runtime.get("roundSavePending")).toBe(false);
    expect(mocks.meta.mock.calls[1][0].openedAt).toBe(new Date(openedAt as number).toISOString());
  });
  it("retries collection metadata without resaving or advancing the collected document", async () => {
    mocks.meta.mockRejectedValueOnce(new Error("Metadata unavailable"));
    await expect(collect()).rejects.toThrow("Metadata unavailable");
    const doc = documents.get(docId)!; const revision = doc.get("revision"); const collectedAt = runtime.get("collectedAt");
    expect(runtime.get("collectionSavePending")).toBe(false); expect(runtime.get("roundSavePending")).toBe(true);
    await expect(teacher("REVISE")).rejects.toThrow("Retry saving activity state");
    await teacher("SYNC_STATE");
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(doc.get("revision")).toBe(revision);
    expect(runtime.get("collectedAt")).toBe(collectedAt); expect(runtime.get("roundSavePending")).toBe(false);
  });
  it("cannot acknowledge round state before unfinished collected work is saved", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Work unavailable")); await expect(collect()).rejects.toThrow("Work unavailable");
    await expect(teacher("SYNC_STATE")).rejects.toThrow("Retry Collect");
    expect(runtime.get("roundSavePending")).toBe(true);
  });
  it("can reconcile metadata without acknowledging a student's separate unsaved work", async () => {
    documents.get(docId)!.set("submissionSavePending", true); runtime.set("roundSavePending", true);
    await teacher("SYNC_STATE");
    expect(runtime.get("roundSavePending")).toBe(false);
    expect(documents.get(docId)!.get("submissionSavePending")).toBe(true);
    await expect(teacher("COMPLETE")).rejects.toThrow("Student work is waiting to save");
  });
  it("keeps completion pending until the API has confirmed classroom navigation", async () => {
    runtime.set("phase", "collected");
    expect(await teacher("COMPLETE", true)).toEqual({ phase: "completed" });
    const completedAt = runtime.get("completedAt"); expect(runtime.get("roundSavePending")).toBe(true);
    await teacher("SYNC_STATE", true);
    expect(runtime.get("completedAt")).toBe(completedAt); expect(runtime.get("roundSavePending")).toBe(true);
    expect(mocks.meta.mock.calls[1][0].completedAt).toBe(new Date(completedAt as number).toISOString());
  });
  it("requires collection before completing so active writing cannot be discarded", async () => {
    await expect(teacher("COMPLETE")).rejects.toThrow("Collect the document before completing");
    expect(runtime.get("phase")).toBe("active");
    expect(mocks.meta).not.toHaveBeenCalled();
  });
});

describe("student document save recovery", () => {
  it("shows a failed save and retries the original work without advancing its revision", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(student()).rejects.toThrow("Database unavailable");
    const doc = documents.get(docId)!;
    expect(doc.get("submissionSavePending")).toBe(true);
    const submittedAt = doc.get("submittedAt") as number;
    expect(doc.get("pendingSubmission")).toEqual(expect.any(String));
    expect(String(doc.get("pendingSubmission"))).not.toContain("Original work");
    expect(mocks.broadcast).not.toHaveBeenCalled();
    expect(await student("Changed retry payload")).toEqual({ status: "submitted" });
    expect(mocks.save.mock.calls[1][0]).toMatchObject({ contentJson: { text: "Original work" }, plainText: "Original work", wordCount: 2, revision: 1 });
    expect(mocks.save.mock.calls[1][0].submittedAt).toBe(new Date(submittedAt).toISOString());
    expect(doc.get("revision")).toBe(1);
    expect(doc.get("submissionSavePending")).toBe(false);
    expect(mocks.yjs).not.toHaveBeenCalled();
  });
  it("accepts a lost-response retry with the previously frozen submission", async () => {
    await student(); await student("Replacement");
    expect(mocks.save.mock.calls[1][0]).toMatchObject({ plainText: "Original work", revision: 1 });
  });
  it("saves deliberate empty work without reading or substituting the room document", async () => {
    await student("");
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ plainText: "", contentJson: { text: "" }, wordCount: 0 }));
    expect(mocks.yjs).not.toHaveBeenCalled();
  });
  it("allows the original group submitter to retry after Ready flags reset", async () => {
    runtime.set("participationMode", "group"); runtime.set("settings", { groupSubmitPolicy: "everyone_ready" });
    groups.set("group-a", new Node({ name: "Group A", memberIds: ["student-a", "student-b"], leaderId: "student-a" }));
    participants.set("student-b", new Node({ role: "player", ready: true }));
    const doc = documents.get(docId)!; doc.set("ownerType", "group"); doc.set("ownerId", "group-a");
    mocks.save.mockRejectedValueOnce(new Error("Offline"));
    await expect(student()).rejects.toThrow("Offline");
    expect(participants.get("student-a")!.get("ready")).toBe(false);
    expect(await student()).toEqual({ status: "submitted" });
    expect(mocks.save.mock.calls[1][0].contributorIds).toEqual(["student-a", "student-b"]);
  });
  it("does not let an unrelated student retry another student's saved snapshot", async () => {
    await student();
    await expect(applyDocumentStudentCommand({ roomId: "room-a", roundId: "round-a", userId: "student-b", command: { type: "SUBMIT", documentId: docId } })).rejects.toThrow("only submit your own document");
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it("does not accept a forged pending submission from shared room storage", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Offline"));
    await expect(student()).rejects.toThrow("Offline");
    const doc = documents.get(docId)!;
    doc.set("pendingSubmission", { documentId: docId, ownerId: "student-a", ownerType: "student", revision: 1, submittedBy: "student-a", contributorIds: ["student-a"], plainText: "Forged replacement", submissionType: "manual" });
    await expect(student()).rejects.toThrow("Already submitted");
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it("checks recovery configuration before changing a student's work", async () => {
    vi.stubEnv("DOCUMENT_SUBMISSION_SECRET", ""); vi.stubEnv("VIRTUAL_CLASSROOM_COOKIE_SECRET", ""); vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "");
    await expect(student()).rejects.toThrow("recovery is not configured");
    expect(documents.get(docId)!.get("status")).toBe("active");
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("rejects malformed text before marking editable work as submitted", async () => {
    await expect(applyDocumentStudentCommand({ roomId: "room-a", roundId: "round-a", userId: "student-a", command: { type: "SUBMIT", documentId: docId, plainText: 42 as unknown as string } })).rejects.toThrow("text must be a string");
    expect(documents.get(docId)!.get("status")).toBe("active");
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});

describe("teacher document collection recovery", () => {
  it("keeps collection retryable when reading work fails, without making a blank record", async () => {
    mocks.yjs.mockRejectedValueOnce(new Error("Could not read this document"));
    await expect(collect()).rejects.toThrow("Could not read");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(runtime.get("collectionSavePending")).toBe(true);
    const submittedAt = documents.get(docId)!.get("submittedAt");
    const collectedAt = runtime.get("collectedAt");
    expect(await collect()).toEqual({ phase: "collected" });
    expect(documents.get(docId)!.get("revision")).toBe(2);
    expect(documents.get(docId)!.get("submittedAt")).toBe(submittedAt);
    expect(runtime.get("collectedAt")).toBe(collectedAt);
    expect(runtime.get("collectionSavePending")).toBe(false);
  });
  it("reuses the captured work after a database outage instead of collecting edited content", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Offline"));
    await expect(collect()).rejects.toThrow("Offline");
    mocks.yjs.mockResolvedValue({ contentJson: { text: "Changed later" }, plainText: "Changed later", wordCount: 2 });
    await collect();
    expect(mocks.yjs).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[1][0]).toMatchObject({ plainText: "Collected work", revision: 2 });
  });
  it("retries only the unfinished documents after a partial collection", async () => {
    addDocument("document:student:student-b", "student-b");
    mocks.save.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Offline"));
    await expect(collect()).rejects.toThrow("Offline");
    expect(documents.get(docId)!.get("submissionSavePending")).toBe(false);
    await collect();
    expect(mocks.save.mock.calls.map(([input]) => input.documentId)).toEqual([docId, "document:student:student-b", "document:student:student-b"]);
    expect(mocks.yjs).toHaveBeenCalledTimes(2);
  });
  it("includes a student's unfinished manual submission using its original content", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Offline"));
    await expect(student()).rejects.toThrow("Offline");
    await collect();
    expect(mocks.save.mock.calls[1][0]).toMatchObject({ plainText: "Original work", revision: 1, submissionType: "manual" });
    expect(mocks.yjs).not.toHaveBeenCalled();
  });
  it("does not complete an activity while a student's manual submission is unsaved", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Offline"));
    await expect(student()).rejects.toThrow("Offline");
    await expect(applyDocumentTeacherCommand({ roomId: "room-a", roundId: "round-a", sessionId: "session-a", hostUserId: "teacher-a", command: { type: "COMPLETE" } })).rejects.toThrow("Student work is waiting to save");
    expect(runtime.get("phase")).toBe("active");
  });
  it.each(["REVISE", "COMPLETE", "SHOW"] as const)("prevents %s from skipping a failed collection", async (type) => {
    mocks.save.mockRejectedValueOnce(new Error("Offline"));
    await expect(collect()).rejects.toThrow("Offline");
    const command = type === "SHOW" ? { type, documentId: docId } : { type };
    await expect(applyDocumentTeacherCommand({ roomId: "room-a", roundId: "round-a", sessionId: "session-a", hostUserId: "teacher-a", command })).rejects.toThrow("Retry Collect");
    expect(runtime.get("phase")).toBe("collected");
  });
});
