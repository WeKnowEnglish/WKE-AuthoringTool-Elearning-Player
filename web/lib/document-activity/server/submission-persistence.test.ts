import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistDocumentSubmission, listDocumentSubmissions } from "./submissions";

const mocks = vi.hoisted(() => ({ service: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleSupabase: mocks.service }));
const document = {
  roundId: "round-a", documentId: "document-a", ownerType: "student" as const, ownerId: "student-a",
  contributorIds: ["student-a"], revision: 1, submissionType: "manual" as const,
  contentJson: { text: "Original" }, plainText: "Original", wordCount: 1,
};
let rows: Map<string, Record<string, unknown>>;
beforeEach(() => {
  vi.resetAllMocks(); rows = new Map();
  mocks.upsert.mockImplementation(async (row: Record<string, unknown>, options: { ignoreDuplicates?: boolean }) => {
    const key = String(row.id);
    if (!rows.has(key) || !options.ignoreDuplicates) rows.set(key, structuredClone(row));
    return { error: null };
  });
  mocks.service.mockReturnValue({ from: () => ({ upsert: mocks.upsert }) });
});

describe.each([
  { kind: "document", save: () => persistDocumentSubmission(document), retryChanged: () => persistDocumentSubmission({ ...document, ownerId: "student-b", contributorIds: ["student-b"], plainText: "Replacement", contentJson: { text: "Replacement" } }), nextRevision: () => persistDocumentSubmission({ ...document, revision: 2 }) },
])("$kind submission persistence", ({ save, retryChanged, nextRevision }) => {
  it("preserves the first recorded revision, content, credit, and timestamp on retry", async () => {
    await save();
    const original = structuredClone([...rows.values()]);
    await retryChanged();
    expect([...rows.values()]).toEqual(original);
    expect(mocks.upsert.mock.calls[0][1]).toMatchObject({ ignoreDuplicates: true });
  });
  it("records a new revision separately", async () => {
    await save(); await nextRevision();
    expect([...rows.values()].map((row) => row.revision)).toEqual([1, 2]);
  });
  it("does not claim a save when the service is unconfigured", async () => {
    mocks.service.mockReturnValue(null);
    await expect(save()).rejects.toThrow("storage is unavailable");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("reports a returned database error", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "Database offline" } });
    await expect(save()).rejects.toThrow("Could not save");
    expect(rows.size).toBe(0);
  });
  it("does not swallow a transport failure", async () => {
    mocks.upsert.mockRejectedValue(new Error("Connection lost"));
    await expect(save()).rejects.toThrow("Connection lost");
  });
});

describe("document submission history", () => {
  function listQuery(result: unknown) {
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn().mockResolvedValue(result) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
    mocks.service.mockReturnValue({ from: () => query });
    return query;
  }
  it("reports storage being unavailable", async () => {
    mocks.service.mockReturnValue(null);
    await expect(listDocumentSubmissions("round-a")).rejects.toThrow("unavailable");
  });
  it("does not present a query failure as no student work", async () => {
    listQuery({ data: null, error: { message: "Offline" } });
    await expect(listDocumentSubmissions("round-a")).rejects.toThrow("Could not load");
  });
  it("allows a successful empty result", async () => {
    const query = listQuery({ data: [], error: null });
    expect(await listDocumentSubmissions("round-a")).toEqual([]);
    expect(query.eq).toHaveBeenCalledWith("round_id", "round-a");
  });
});
