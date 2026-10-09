import { beforeEach, describe, expect, it, vi } from "vitest";
import { readDocumentYjsContent } from "./yjs-content";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/live-game/server/liveblocks-client", () => ({
  getLiveblocksServerClient: () => ({ getYjsDocument: mocks.read }),
}));
const input = { roomId: "classroom-a", documentId: "document:student:a" };
const ownWork = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "My own work" }] }] };
beforeEach(() => vi.resetAllMocks());

describe("collecting the requested document", () => {
  it("reads the explicitly requested key", async () => {
    mocks.read.mockResolvedValue(ownWork);
    expect(await readDocumentYjsContent(input)).toEqual({ contentJson: ownWork, plainText: "My own work", wordCount: 3 });
    expect(mocks.read).toHaveBeenCalledExactlyOnceWith(input.roomId, { key: input.documentId, format: true });
  });
  it("uses only an explicitly present document in the room fallback", async () => {
    mocks.read.mockRejectedValueOnce(new Error("Keyed read unavailable")).mockResolvedValueOnce({
      [input.documentId]: ownWork, "document:student:b": "Another student's private work",
    });
    expect(await readDocumentYjsContent(input)).toEqual({ contentJson: ownWork, plainText: "My own work", wordCount: 3 });
  });
  it.each([{}, [], ""]) ("preserves explicitly returned empty work: %j", async (empty) => {
    mocks.read.mockResolvedValueOnce(empty);
    expect(await readDocumentYjsContent(input)).toEqual({ contentJson: empty, plainText: "", wordCount: 0 });
    expect(mocks.read).toHaveBeenCalledTimes(1);
  });
  it("preserves an explicitly empty fallback document", async () => {
    mocks.read.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ [input.documentId]: "", other: "Private" });
    expect(await readDocumentYjsContent(input)).toEqual({ contentJson: "", plainText: "", wordCount: 0 });
  });
  it.each([
    { other: "Another student's private work" },
    { [input.documentId]: null },
    ["Another student's private work"],
    Object.create({ [input.documentId]: "Inherited content" }),
  ])("does not save an unrelated or missing document: %j", async (roomContent) => {
    mocks.read.mockResolvedValueOnce(null).mockResolvedValueOnce(roomContent);
    await expect(readDocumentYjsContent(input)).rejects.toThrow("Could not read this document");
  });
  it("reports a provider outage instead of manufacturing a blank submission", async () => {
    mocks.read.mockRejectedValue(new Error("Provider unavailable"));
    await expect(readDocumentYjsContent(input)).rejects.toThrow("work has not been saved");
  });
});
