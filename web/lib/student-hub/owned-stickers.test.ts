import { describe, expect, it } from "vitest";
import { STICKER_LIBRARY } from "@/lib/progress/sticker-library";
import { uniqueOwnedStickers } from "@/lib/student-hub/owned-stickers";

describe("uniqueOwnedStickers", () => {
  it("returns unique defs for owned ids and ignores unknown ids", () => {
    const a = STICKER_LIBRARY[0]!.id;
    const b = STICKER_LIBRARY[1]!.id;
    const result = uniqueOwnedStickers([a, a, b, "missing-id"]);
    expect(result.map((s) => s.id).sort()).toEqual([a, b].sort());
  });

  it("returns empty array when nothing owned", () => {
    expect(uniqueOwnedStickers([])).toEqual([]);
  });
});
