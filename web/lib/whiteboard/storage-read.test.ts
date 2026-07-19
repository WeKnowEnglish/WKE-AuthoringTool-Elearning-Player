import { describe, expect, it } from "vitest";
import {
  asElementLookup,
  readLiveObjectField,
  readStorageMapEntries,
  readStorageMapKeys,
  readStorageMapValue,
} from "@/lib/whiteboard/liveblocks/storage-read";

describe("storage-read helpers", () => {
  it("reads plain-object maps from useStorage ToJson", () => {
    const boards = {
      "board:student:s1": { status: "ACTIVE", ownerId: "s1" },
      "board:teacher": { status: "WAITING", ownerId: "t1" },
    };
    expect(readStorageMapKeys(boards).sort()).toEqual([
      "board:student:s1",
      "board:teacher",
    ]);
    expect(readStorageMapValue<{ status: string }>(boards, "board:student:s1")?.status).toBe(
      "ACTIVE",
    );
    expect(readStorageMapEntries(boards)).toHaveLength(2);
  });

  it("reads Map-like structures", () => {
    const boards = new Map([["board:teacher", { status: "WAITING" }]]);
    expect(readStorageMapKeys(boards)).toEqual(["board:teacher"]);
    expect(readStorageMapValue<{ status: string }>(boards, "board:teacher")?.status).toBe(
      "WAITING",
    );
  });

  it("reads live-object fields from plain or get()", () => {
    expect(readLiveObjectField({ status: "OPEN" }, "status")).toBe("OPEN");
    expect(
      readLiveObjectField(
        { get: (k: string) => (k === "status" ? "OPEN" : undefined) },
        "status",
      ),
    ).toBe("OPEN");
  });

  it("looks up elements from plain objects", () => {
    const lookup = asElementLookup({ e1: { id: "e1", type: "text" } });
    expect(lookup.get("e1")).toEqual({ id: "e1", type: "text" });
    expect(lookup.get("missing")).toBeUndefined();
  });
});
